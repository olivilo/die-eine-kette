package blacklist

import (
	"fmt"
	"sync"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/logger"
)

// Die Eine Kette: Der Nutzer-Blacklist (sofortige Token-Sperre bei Deaktivierung)
// wird bei aktivem Redis dort geführt, damit Sperren über MEHRERE Instanzen hinweg
// sofort greifen. Ohne Redis (Einzelinstanz) dient die lokale sync.Map. Sie wird
// zusätzlich immer gepflegt und dient als Fallback, falls Redis kurzzeitig ausfällt.
var blackList sync.Map

func init() {
	blackList = sync.Map{}
}

func userId2Key(id int) string {
	return fmt.Sprintf("userid_%d", id)
}

// redisKey — eigener Präfix, damit der Ban-Eintrag nicht mit anderen Redis-Keys kollidiert.
func redisKey(id int) string {
	return fmt.Sprintf("blacklist_userid_%d", id)
}

func BanUser(id int) {
	blackList.Store(userId2Key(id), true)
	if common.RedisEnabled {
		if err := common.RedisSet(redisKey(id), "1", 0); err != nil {
			logger.SysError("blacklist: failed to set ban in Redis: " + err.Error())
		}
	}
}

func UnbanUser(id int) {
	blackList.Delete(userId2Key(id))
	if common.RedisEnabled {
		if err := common.RedisDel(redisKey(id)); err != nil {
			logger.SysError("blacklist: failed to remove ban from Redis: " + err.Error())
		}
	}
}

func IsUserBanned(id int) bool {
	if common.RedisEnabled {
		val, err := common.RedisGet(redisKey(id))
		if err == nil {
			return val != ""
		}
		// redis.Nil (Key fehlt) heißt "nicht gesperrt". Bei echten Verbindungsfehlern
		// fallen wir auf die lokale Map zurück — die dauerhafte Sperre ist ohnehin
		// zusätzlich über den DB-Status (CacheIsUserEnabled) abgesichert.
		if err.Error() != "redis: nil" {
			logger.SysError("blacklist: Redis lookup failed, falling back to local map: " + err.Error())
			_, ok := blackList.Load(userId2Key(id))
			return ok
		}
		return false
	}
	_, ok := blackList.Load(userId2Key(id))
	return ok
}
