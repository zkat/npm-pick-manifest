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
  t.end()
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
  t.end()
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
  t.end()
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
  t.end()
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
  t.end()
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
  t.end()
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
  }, { code: 'ETARGET' }, 'no matching specs')
  t.end()
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
  }, { code: 'ETARGET' }, 'got correct error on match failure')
  t.end()
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
  }, { code: 'E403' }, 'got correct error on match failure')
  t.end()
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
  }, { code: 'E403' }, 'got correct error on match failure')
  t.end()
})

test('E403 if version is forbidden, provided a major version', t => {
  const metadata = {
    'dist-tags': {
      latest: '2.0.5',
      // note: this SHOULD not be allowed, but it's possible that
      // a registry proxy may implement policyRestrictions without
      // properly modifying dist-tags when it does so.
      borked: '2.1.5'
    },
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
  }, { code: 'E403' }, 'got correct error on match failure')
  t.throws(() => {
    pickManifest(metadata, 'borked')
  }, { code: 'E403' }, 'got correct error on policy restricted dist-tag')
  t.end()
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
    pickManifest(metadata, '^1.0.0', { defaultTag: 'foo' }).version,
    '1.0.1',
    'picked the version for foo'
  )
  t.equal(
    pickManifest(metadata, '^2.0.0', { defaultTag: 'foo' }).version,
    '2.0.0',
    'no match, no foo'
  )
  t.equal(
    pickManifest(metadata, '^1.0.0').version,
    '1.0.0',
    'default to `latest`'
  )
  t.end()
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
    pickManifest(metadata, '*', { defaultTag: 'beta' }).version,
    '2.0.0-beta.0',
    'used defaultTag for all-prerelease splat.'
  )
  t.equal(
    pickManifest(metadata, '*').version,
    '1.0.0-pre.0',
    'defaulted to `latest` when wanted is *'
  )
  t.equal(
    pickManifest(metadata, '', { defaultTag: 'beta' }).version,
    '2.0.0-beta.0',
    'used defaultTag for all-prerelease ""'
  )
  t.equal(
    pickManifest(metadata, '').version,
    '1.0.0-pre.0',
    'defaulted to `latest` when wanted is ""'
  )
  t.end()
})

test('errors if metadata has no versions', t => {
  t.throws(() => {
    pickManifest({ versions: {} }, '^1.0.0')
  }, { code: 'ENOVERSIONS' })
  t.throws(() => {
    pickManifest({}, '^1.0.0')
  }, { code: 'ENOVERSIONS' })
  t.end()
})

test('errors if metadata has no versions or restricted versions', t => {
  t.throws(() => {
    pickManifest({ versions: {}, policyRestrictions: { versions: {} } }, '^1.0.0')
  }, { code: 'ENOVERSIONS' })
  t.throws(() => {
    pickManifest({}, '^1.0.0')
  }, { code: 'ENOVERSIONS' })
  t.end()
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
  t.end()
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
  t.end()
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
  t.end()
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
  t.end()
})

test('will use deprecated version if no other suitable match', t => {
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
  t.end()
})

test('accepts opts.before option to do date-based cutoffs', t => {
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
      '2.0.2': '2018-01-03T00:00:00.123Z',
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
    before: '2018-01-02'
  })
  t.equal(manifest.version, '2.0.0', 'filtered out 3.0.0 because of dates')

  manifest = pickManifest(metadata, 'latest', {
    before: '2018-01-02'
  })
  t.equal(manifest.version, '2.0.0', 'tag specs pick highest before dist-tag but within the range in question')

  manifest = pickManifest(metadata, '*', {
    before: Date.parse('2018-01-03T00:00:00.000Z')
  })
  t.equal(manifest.version, '2.0.1', 'numeric timestamp supported with ms accuracy')

  manifest = pickManifest(metadata, '*', {
    before: new Date('2018-01-03T00:00:00.000Z')
  })
  t.equal(manifest.version, '2.0.1', 'date obj supported with ms accuracy')

  t.throws(() => pickManifest(metadata, '3.0.0', {
    before: '2018-01-02'
  }), { code: 'ETARGET' }, 'version filtered out by date')

  t.throws(() => pickManifest(metadata, '', {
    before: '1918-01-02'
  }), { code: 'ENOVERSIONS' }, 'all version filtered out by date')

  manifest = pickManifest(metadata, '^2', {
    before: '2018-01-02'
  })
  t.equal(manifest.version, '2.0.0', 'non-tag ranges filtered')

  t.throws(() => {
    pickManifest(metadata, '^3', {
      before: '2018-01-02'
    })
  }, /with a date before/, 'range for out-of-range spec fails even if defaultTag avail')
  t.end()
})

test('prefers versions that satisfy the engines requirement', t => {
  const pack = {
    versions: {
      '1.0.0': { version: '1.0.0', engines: { node: '>=4' } },
      '1.1.0': { version: '1.1.0', engines: { node: '>=6' } },
      '1.2.0': { version: '1.2.0', engines: { node: '>=8' } },
      '1.3.0': { version: '1.3.0', engines: { node: '>=10' } },
      '1.4.0': { version: '1.4.0', engines: { node: '>=12' } },
      '1.5.0': { version: '1.5.0', engines: { node: '>=14' } }
    }
  }

  t.equal(pickManifest(pack, '1.x', { nodeVersion: '14.0.0' }).version, '1.5.0')
  t.equal(pickManifest(pack, '1.x', { nodeVersion: '12.0.0' }).version, '1.4.0')
  t.equal(pickManifest(pack, '1.x', { nodeVersion: '10.0.0' }).version, '1.3.0')
  t.equal(pickManifest(pack, '1.x', { nodeVersion: '8.0.0' }).version, '1.2.0')
  t.equal(pickManifest(pack, '1.x', { nodeVersion: '6.0.0' }).version, '1.1.0')
  t.equal(pickManifest(pack, '1.x', { nodeVersion: '4.0.0' }).version, '1.0.0')
  t.equal(pickManifest(pack, '1.x', { nodeVersion: '1.2.3' }).version, '1.5.0',
    'if no engine-match exists, just use whatever')
  t.end()
})

test('support selecting staged versions if allowed by options', t => {
  const pack = {
    'dist-tags': {
      latest: '1.0.0',
      // note: this SHOULD not be allowed, but it's possible that
      // a registry proxy may implement stagedVersions without
      // properly modifying dist-tags when it does so.
      borked: '2.0.0'
    },
    versions: {
      '1.0.0': { version: '1.0.0' }
    },
    stagedVersions: {
      versions: {
        '2.0.0': { version: '2.0.0' }
      }
    },
    time: {
      '1.0.0': '2018-01-03T00:00:00.000Z'
    }
  }

  t.equal(pickManifest(pack, '1||2').version, '1.0.0')
  t.equal(pickManifest(pack, '1||2', { includeStaged: true }).version, '1.0.0')
  t.equal(pickManifest(pack, '2', { includeStaged: true }).version, '2.0.0')
  t.equal(pickManifest(pack, '2', {
    includeStaged: true,
    before: '2018-01-01'
  }).version, '2.0.0', 'version without time entry not subject to before filtering')
  t.throws(() => pickManifest(pack, '2'), { code: 'ETARGET' })
  t.throws(() => pickManifest(pack, 'borked'), { code: 'ETARGET' })

  t.end()
})

test('support excluding avoided version ranges', t => {
  const metadata = {
    name: 'vulny',
    'dist-tags': {
      latest: '1.0.3'
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '1.0.3': { version: '1.0.3' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '^1.0.0', {
    avoid: '>=1.0.3'
  })
  t.equal(manifest.version, '1.0.2', 'picked the right manifest using ^')
  const cannotAvoid = pickManifest(metadata, '^1.0.0', {
    avoid: '1.x'
  })
  t.match(cannotAvoid, {
    version: '1.0.3',
    _shouldAvoid: true
  }, 'could not avoid within SemVer range')
  t.end()
})

test('support excluding avoided version ranges strictly', t => {
  const metadata = {
    name: 'vulny',
    'dist-tags': {
      latest: '1.0.3'
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '1.0.3': { version: '1.0.3' },
      '2.0.0': { version: '2.0.0' }
    }
  }
  const manifest = pickManifest(metadata, '^1.0.2', {
    avoid: '1.x >1.0.2',
    avoidStrict: true
  })
  t.match(manifest, {
    version: '1.0.2'
  }, 'picked the right manifest using ^')

  const breakRange = pickManifest(metadata, '1.0.2', {
    avoid: '1.x <1.0.3',
    avoidStrict: true
  })
  t.match(breakRange, {
    version: '1.0.3',
    _outsideDependencyRange: true,
    _isSemVerMajor: false
  }, 'broke dep range, but not SemVer major')

  const majorBreak = pickManifest(metadata, '1.0.2', {
    avoid: '1.x',
    avoidStrict: true
  })
  t.match(majorBreak, {
    version: '2.0.0',
    _outsideDependencyRange: true,
    _isSemVerMajor: true
  }, 'broke dep range with SemVer-major change')

  t.throws(() => pickManifest(metadata, '^1.0.0', {
    avoid: '<3.0.0',
    avoidStrict: true
  }), {
    code: 'ETARGET',
    message: 'No avoidable versions for vulny',
    avoid: '<3.0.0'
  })

  t.end()
})

test('normalize package bins', t => {
  const bin = './bin/foobar.js'

  const name = 'foobar'
  const metadata = {
    name,
    versions: {
      '1.0.0': { bin, name, version: '1.0.0' },
      '1.0.1': { bin, name, version: '1.0.1' },
      '1.0.2': { bin, name, version: '1.0.2' },
      '2.0.0': { bin, name, version: '2.0.0' }
    }
  }

  const nameScoped = '@scope/foobar'
  const metadataScoped = {
    nameScoped,
    versions: {
      '1.0.0': { bin, name: nameScoped, version: '1.0.0' },
      '1.0.1': { bin, name: nameScoped, version: '1.0.1' },
      '1.0.2': { bin, name: nameScoped, version: '1.0.2' },
      '2.0.0': { bin, name: nameScoped, version: '2.0.0' }
    }
  }

  const manifest = pickManifest(metadata, '^1.0.0')
  t.strictSame(manifest, {
    name,
    version: '1.0.2',
    bin: {
      foobar: 'bin/foobar.js'
    }
  }, 'normalized the package bin, unscoped')

  const manifestScoped = pickManifest(metadataScoped, '^1.0.0')
  t.strictSame(manifestScoped, {
    name: nameScoped,
    version: '1.0.2',
    bin: {
      foobar: 'bin/foobar.js'
    }
  }, 'normalized the package bin, scoped')

  t.end()
})
