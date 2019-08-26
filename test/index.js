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

test('E403 if version is forbidden', t => {
  const metadata = {
    policyRestrictions: {
      versions: {
        '2.1.0': { version: '2.1.0' }
      }
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '2.0.0': { version: '2.0.0' },
      '2.0.5': { version: '2.0.5' }
    }
  }
  t.throws(() => {
    pickManifest(metadata, '2.1.0')
  }, {code: 'E403'}, 'got correct error on match failure')
  t.done()
})

test('E403 if version is forbidden, provided a minor version', t => {
  const metadata = {
    policyRestrictions: {
      versions: {
        '2.1.0': { version: '2.1.0' },
        '2.1.5': { version: '2.1.5' }
      }
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '2.0.0': { version: '2.0.0' },
      '2.0.5': { version: '2.0.5' }
    }
  }
  t.throws(() => {
    pickManifest(metadata, '2.1')
  }, {code: 'E403'}, 'got correct error on match failure')
  t.done()
})

test('E403 if version is forbidden, provided a major version', t => {
  const metadata = {
    policyRestrictions: {
      versions: {
        '1.0.0': { version: '1.0.0' },
        '2.1.0': { version: '2.1.0' },
        '2.1.5': { version: '2.1.5' }
      }
    },
    versions: {
      '2.0.0': { version: '2.0.0' },
      '2.0.5': { version: '2.0.5' }
    }
  }
  t.throws(() => {
    pickManifest(metadata, '1')
  }, {code: 'E403'}, 'got correct error on match failure')
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

test('errors if metadata has no versions or restricted versions', t => {
  t.throws(() => {
    pickManifest({versions: {}, policyRestrictions: { versions: {} }}, '^1.0.0')
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

test('matches skip deprecated versions', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.1.0': { version: '1.1.0', deprecated: 'yes' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '^1.0.0')
  t.equal(manifest.version, '1.0.1', 'picked the right manifest')
  t.done()
})

test('matches deprecated versions if we have to', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.1.0': { version: '1.1.0', deprecated: 'yes' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '^1.1.0')
  t.equal(manifest.version, '1.1.0', 'picked the right manifest')
  t.done()
})

test('accepts opts.includeDeprecated option to disable skipping', t => {
  const metadata = {
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.1.0': { version: '1.1.0', deprecated: 'yes' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '^1.0.0', {
    includeDeprecated: true
  })
  t.equal(manifest.version, '1.1.0', 'picked the right manifest')
  t.done()
})

test('accepts opts.enjoyBy option to do date-based cutoffs', t => {
  const metadata = {
    'dist-tags': {
      latest: '3.0.0'
    },
    time: {
      modified: '2018-01-03T00:00:00.000Z',
      created: '2018-01-01T00:00:00.000Z',
      '1.0.0': '2018-01-01T00:00:00.000Z',
      '2.0.0': '2018-01-02T00:00:00.000Z',
      '2.0.1': '2018-01-03T00:00:00.000Z',
      '3.0.0': '2018-01-04T00:00:00.000Z'
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '2.0.0': { version: '2.0.0' },
      '2.0.1': { version: '2.0.1' },
      '3.0.0': { version: '3.0.0' }
    }
  }

  let manifest = pickManifest(metadata, '*', {
    enjoyBy: '2018-01-02'
  })
  t.equal(manifest.version, '2.0.0', 'filtered out 3.0.0 because of dates')

  manifest = pickManifest(metadata, 'latest', {
    enjoyBy: '2018-01-02'
  })
  t.equal(manifest.version, '2.0.0', 'tag specs pick highest before dist-tag but within the range in question')

  manifest = pickManifest(metadata, '3.0.0', {
    enjoyBy: '2018-01-02'
  })
  t.equal(manifest.version, '3.0.0', 'requesting specific version overrides')

  manifest = pickManifest(metadata, '^2', {
    enjoyBy: '2018-01-02'
  })
  t.equal(manifest.version, '2.0.0', 'non-tag ranges filtered')

  t.throws(() => {
    pickManifest(metadata, '^3', {
      enjoyBy: '2018-01-02'
    })
  }, /Enjoy By/, 'range for out-of-range spec fails even if defaultTag avail')
  t.done()
})
