/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.ilyasbozdemir.evraktron',
  npmRebuild: true,
  productName: 'Evrak Takip App',
  directories: {
    output: 'dist-electron'
  },
  files: [
    'out/**/*',
    'public/**/*',
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
    icon: 'public/icon.ico',
    executableName: 'evraktron',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    fileAssociations: [
      {
        ext: 'etapp',
        name: 'Evrak Takip App Dosyası',
        description: 'Evrak Takip App ETAPP dosyası',
        icon: 'public/icon.ico',
        role: 'Editor'
      }
    ]
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Evrak Takip App',
    include: 'build/installer.nsh'
  },
  portable: {
    artifactName: 'EvrakTakipApp-Portable-${version}.exe'
  }
};
