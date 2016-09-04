const chai = require('chai')
const Promise = require('bluebird')
const redis = require('redis')

global.assert = chai.assert
global.expect = chai.expect
chai.should()

Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)
const redisURL = process.env.REDIS_TEST_URL || 'redis://localhost:6379'
const client = redis.createClient(redisURL)
global.client = client
