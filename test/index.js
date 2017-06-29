'use strict'

const test = require('tap').test

const pickManifest = require('..')

test('basic carat range selection', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '^1.0.0')
  t.equal(manifest.version, '1.0.2', 'picked the right manifest using ^')
  t.done()
})

test('basic tilde range selection', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '~1.0.0')
  t.equal(manifest.version, '1.0.2', 'picked the right manifest using ~')
  t.done()
})

test('basic mathematical range selection', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest1 = pickManifest(metadata, '>=1.0.0 <2')
  t.equal(manifest1.version, '1.0.2', 'picked the right manifest using mathematical range')
  const manifest2 = pickManifest(metadata, '=1.0.0')
  t.equal(manifest2.version, '1.0.0', 'picked the right manifest using mathematical range')
  t.done()
})

test('basic version selection', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '1.0.0')
  t.equal(manifest.version, '1.0.0', 'picked the right manifest using specific version')
  t.done()
})

test('basic tag selection', t => {
  const metadata = {
    'dist-tags': {
      foo: '1.0.1'
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, 'foo')
  t.equal(manifest.version, '1.0.1', 'picked the right manifest using tag')
  t.done()
})

test('errors if a non-registry spec is provided', t => {
  const metadata = {
    'dist-tags': {
      foo: '1.0.1'
    },
    versions: {
      '1.0.1': { version: '1.0.1' }
    }
  }
  t.throws(() => {
    pickManifest(metadata, '!?!?!?!')
  }, /Invalid tag name/)
  t.throws(() => {
    pickManifest(metadata, 'file://foo.tar.gz')
  }, /Only tag, version, and range are supported/)
  t.done()
})

test('skips any invalid version keys', t => {
  // Various third-party registries are prone to having trash as
  // keys. npm simply skips them. Yay robustness.
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      'lol ok': { version: '1.0.1' }
    }
  }
  const manifest = pickManifest(metadata, '^1.0.0')
  t.equal(manifest.version, '1.0.0', 'avoided bad key')
  t.throws(() => {
    pickManifest(metadata, '^1.0.1')
  }, {code: 'ETARGET'}, 'no matching specs')
  t.done()
})

test('ETARGET if range does not match anything', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '2.0.0': { version: '2.0.0' },
      '2.0.5': { version: '2.0.5' }
    }
  }
  t.throws(() => {
    pickManifest(metadata, '^2.1.0')
  }, {code: 'ETARGET'}, 'got correct error on match failure')
  t.done()
})

test('if `defaultTag` matches a given range, use it', t => {
  const metadata = {
    'dist-tags': {
      foo: '1.0.1',
      latest: '1.0.0'
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  t.equal(
    pickManifest(metadata, '^1.0.0', {defaultTag: 'foo'}).version,
    '1.0.1',
    'picked the version for foo'
  )
  t.equal(
    pickManifest(metadata, '^2.0.0', {defaultTag: 'foo'}).version,
    '2.0.0',
    'no match, no foo'
  )
  t.equal(
    pickManifest(metadata, '^1.0.0').version,
    '1.0.0',
    'default to `latest`'
  )
  t.done()
})

test('* ranges use `defaultTag` if no versions match', t => {
  const metadata = {
    'dist-tags': {
      latest: '1.0.0-pre.0',
      beta: '2.0.0-beta.0'
    },
    versions: {
      '1.0.0-pre.0': { version: '1.0.0-pre.0' },
      '1.0.0-pre.1': { version: '1.0.0-pre.1' },
      '2.0.0-beta.0': { version: '2.0.0-beta.0' },
      '2.0.0-beta.1': { version: '2.0.0-beta.1' }
    }
  }
  t.equal(
    pickManifest(metadata, '*', {defaultTag: 'beta'}).version,
    '2.0.0-beta.0',
    'used defaultTag for all-prerelease splat.'
  )
  t.equal(
    pickManifest(metadata, '*').version,
    '1.0.0-pre.0',
    'defaulted to `latest`'
  )
  t.done()
})

test('errors if metadata has no versions', t => {
  t.throws(() => {
    pickManifest({versions: {}}, '^1.0.0')
  }, {code: 'ENOVERSIONS'})
  t.throws(() => {
    pickManifest({}, '^1.0.0')
  }, {code: 'ENOVERSIONS'})
  t.done()
})

test('matches even if requested version has spaces', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '  1.0.0 ')
  t.equal(manifest.version, '1.0.0', 'picked the right manifest even though `wanted` had spaced')
  t.done()
})

test('matches even if requested version has garbage', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '== 1.0.0 || foo')
  t.equal(manifest.version, '1.0.0', 'picked the right manifest even though `wanted` had garbage')
  t.done()
})
