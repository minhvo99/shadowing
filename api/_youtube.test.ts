import { expect, test } from 'vitest'
import { proxyUrl } from './_youtube.js'

test('YT_PROXY_URL accepts the formats proxy providers hand out', () => {
  expect(proxyUrl('')).toBeUndefined()
  expect(proxyUrl(undefined)).toBeUndefined()
  expect(proxyUrl(' http://u:p@1.2.3.4:8080 ')).toBe('http://u:p@1.2.3.4:8080')
  expect(proxyUrl('1.2.3.4:8080')).toBe('http://1.2.3.4:8080')
  expect(proxyUrl('u:p@1.2.3.4:8080')).toBe('http://u:p@1.2.3.4:8080')
  // host:port:user:pass (common in provider dashboards); special characters in the password get encoded
  expect(proxyUrl('p.example.com:80:user-1:pa@ss')).toBe('http://user-1:pa%40ss@p.example.com:80')
})
