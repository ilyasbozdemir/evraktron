/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.ilyasbozdemir.evraktron',
  npmRebuild: true,
  productName: 'Evraktron',
  directories: {
    output: 'dist-electron'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'node_modules/**/*',
    '!node_modules/.cache',
    '!node_modules/.vite'
  ],
  asar: true,
  asarUnpack: [
    '**/node_modules/better-sqlite3/**',
    '**/node_modules/bindings/**',
    '**/node_modules/file-uri-to-path/**',
    '**/node_modules/prebuild-install/**'
  ],
  win: {
    icon: 'public/icon.png',
    executableName: 'evraktron',
    target: [
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    fileAssociations: [
      {
        ext: 'evrak',
        name: 'Evraktron Dosyası',
        description: 'Evraktron evrak dosyası',
        icon: 'public/icon.png',
        role: 'Editor'
      }
    ]
  },
  portable: {
    artifactName: 'Evraktron-Portable-${version}.exe'
  }
};
