const asyncClass = require('simple-async-class')

class RedisObject {

  constructor(redisClient, key) {
    this.client = redisClient
    this.key = key
  }

  propertyKey(name) {
    return `${this.key}:${name}`
  }

  * saveProperty(name, serializer=JSON.stringify) {
    yield this.client.setAsync(this.propertyKey(name), serializer(this[name]))
  }

  * loadProperty(name, defaultValue, parser) {
    const property = yield this.client.getAsync(this.propertyKey(name))
    if (property) {
      this[name] = parser(property)
    } else {
      this[name] = defaultValue
    }
  }
}

module.exports = asyncClass(RedisObject)
