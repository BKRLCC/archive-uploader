import path from 'path'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { PublisherGithub } from '@electron-forge/publisher-github'

const config: ForgeConfig = {
  packagerConfig: {
    // Unpack the entire @img scope so both the native .node addon and the
    // libvips .dylib/.dll shared libraries land in app.asar.unpacked/.
    // AutoUnpackNativesPlugin handles .node files; this pattern also covers .dylib/.dll.
    asar: { unpack: '**/@img/**' },
    extraResources: [
      {
        from: 'node_modules/ffmpeg-static',
        to: 'app.asar.unpacked/node_modules/ffmpeg-static',
      },
    ],
    icon: 'src/icons/logo',
    ...(process.env.APPLE_ID
      ? {
          osxSign: {
            identity:
              'Developer ID Application: LIGHT GARDEN AGENCY PTY LTD (BRN84M6L39)',
          },
          osxNotarize: {
            tool: 'notarytool' as const,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD!,
            teamId: process.env.APPLE_TEAM_ID!,
          },
        }
      : {}),
  },
  hooks: {
    // sharp is a native module that Vite can't bundle. Inject it (and its JS deps)
    // into the build directory so the asar packager includes them. The @img scope
    // is covered by asar.unpack above, so native binaries land in app.asar.unpacked/.
    packageAfterCopy: async (_config, buildPath) => {
      const { cp } = await import('fs/promises')
      const nmSrc = path.join(process.cwd(), 'node_modules')
      const nmDest = path.join(buildPath, 'node_modules')
      await Promise.all([
        cp(path.join(nmSrc, 'sharp'), path.join(nmDest, 'sharp'), { recursive: true }),
        cp(path.join(nmSrc, '@img'), path.join(nmDest, '@img'), { recursive: true }),
        cp(path.join(nmSrc, 'detect-libc'), path.join(nmDest, 'detect-libc'), { recursive: true }),
        cp(path.join(nmSrc, 'semver'), path.join(nmDest, 'semver'), { recursive: true }),
      ])
    },
  },
  rebuildConfig: {},
  publishers: [
    new PublisherGithub({
      repository: { owner: 'BKRLCC', name: 'archive-uploader' },
      prerelease: false,
    }),
  ],
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    // Auto-detects and unpacks native .node modules so they work outside the asar.
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
}

export default config
