/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.ilyasbozdemir.evraktron',
  npmRebuild: true,
  productName: 'Evrak Takip Programı',
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
    publisherName: 'İlyas Bozdemir',
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
        ext: 'etap',
        name: 'Evrak Takip Program Dosyası',
        description: 'Evrak Takip Programı (ETAP) dosyası',
        icon: 'public/icon.ico',
        role: 'Editor'
      },
      {
        ext: 'etapp',
        name: 'Evrak Takip Program Dosyası',
        description: 'Evrak Takip Programı (ETAPP) dosyası',
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
    shortcutName: 'Evrak Takip Programı',
    include: 'build/installer.nsh'
  },
  portable: {
    artifactName: 'EvrakTakipApp-Portable-${version}.exe'
  }
};
