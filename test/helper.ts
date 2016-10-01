import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as redis from 'redis'
import { promisifyAll } from 'bluebird'
import { PromisifyRedis } from '../src/redis-object'

chai.use(chaiAsPromised)
const assert = chai.assert

const redisURL = process.env.REDIS_TEST_URL || 'redis://localhost:6379'
const client = redis.createClient(redisURL)
const promisifiedClient = <PromisifyRedis> promisifyAll(client)

export { promisifiedClient as client, assert }
