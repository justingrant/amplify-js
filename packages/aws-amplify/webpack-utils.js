// This module fixes sourcemap paths for the various Amplify packages. It's
// needed because packages at build time live in different (relative) folder
// locations than the folders where packages are installed from npm. For
// example, /packages/aws-amplify/src/index.ts imports @aws-amplify/ui. At build
// time, the aws-amplify and amplify-ui folders are siblings, but when the
// aws-amplify package is installed from npm, the amplify-ui folder is installed
// at ./node_modules/@aws-amplify/ui, which is a new name and is no longer a
// sibling to ./node_modules/aws-amplify like it was at build time. These
// changes mean that end users can't easily debug into Amplify code, especially
// using IDEs like VSCode.
//
// The code in this file changes paths inside Amplify sourcemaps to work around
// the issues above. The following changes are made:
// 1. sourcemap paths that point to node_modules dependencies (e.g. lodash) are
//    mapped to webpack:///./node_modules/*
// 2. sourcemap paths that point to sibling packages under the @aws-amplify
//    alias (like the UI example above) are mapped (using package names, not
//    folders) to webpack:///./node_modules/@aws-amplify/*
// 3. other paths, e.g. relative paths in the same package, or webpack or node
//    builtins, will be left alone (same behavior as current webpack config).
//
// These path mappings are designed to be compatible with VSCode's default
// source mapping options here:
// https://github.com/Microsoft/vscode-chrome-debug#sourcemaps
//
// IMPORTANT: if new packages are added to Amplify, add them to the map below.

const packageFolderMap = {
	'amazon-cognito-identity-js': 'amazon-cognito-identity-js',
	'amplify-ui': '@aws-amplify/ui',
	'amplify-ui-angular': '@aws-amplify/ui-',
	'amplify-ui-components': '@aws-amplify/ui-components',
	'amplify-ui-react': '@aws-amplify/ui-react',
	'amplify-ui-storybook': '@aws-amplify/ui-storybook',
	'amplify-ui-vue': '@aws-amplify/ui-vue',
	analytics: '@aws-amplify/analytics',
	api: '@aws-amplify/api',
	'api-graphql': '@aws-amplify/api-graphql',
	'api-rest': '@aws-amplify/api-rest',
	auth: '@aws-amplify/auth',
	'aws-amplify': 'aws-amplify',
	'aws-amplify-angular': 'aws-amplify-angular',
	'aws-amplify-react': 'aws-amplify-react',
	'aws-amplify-react-native': 'aws-amplify-react-native',
	'aws-amplify-vue': 'aws-amplify-vue',
	cache: '@aws-amplify/cache',
	core: '@aws-amplify/core',
	datastore: '@aws-amplify/datastore',
	interactions: '@aws-amplify/interactions',
	pubsub: '@aws-amplify/pubsub',
	predictions: '@aws-amplify/predictions',
	pushnotification: '@aws-amplify/pushnotification',
	storage: '@aws-amplify/storage',
	xr: '@aws-amplify/xr',
};

const folders = Object.keys(packageFolderMap);
const nodeModules = '/node_modules/';
const webpackNodeModules = '~/';

function devtoolModuleFilenameTemplate(info) {
	const resource = info.resource;

	if (resource.includes(nodeModules)) {
		// dependency paths
		const start = resource.indexOf(nodeModules);
		const after = start + nodeModules.length;
		return webpackNodeModules + resource.substring(after);
	} else if (resource.includes('../')) {
		// handle relative paths to other packages in this monorepo
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			const relative = '../' + folder;
			const start = resource.indexOf(relative);
			if (start !== -1) {
				const after = start + relative.length;
				return (
					webpackNodeModules +
					packageFolderMap[folder] +
					resource.substring(after)
				);
			}
		}
	} else if (resource.startsWith('./')) {
		// The only time we get here is when there's a bug in the toolchain upstream
		// from us that causes imported files (I've seen this only for CSS files and
		// package.json) to have paths that are relative to the package root instead
		// of being relative to the /dist or /lib output folder. Fix this by
		// prefixing with an extra dot.
		return '.' + resource;
	}

	// If we get here, the resource is one of these cases:
	//   1) a relative path to a parent folder, e.g. '../src/foo.js'
	//   2) a plain filename (no path), e.g. 'foo.min.js'
	//   3) one of the invalid paths that webpack itself adds, e.g.
	//      'webpack/universalModuleDefinition', or 'webpack/bootstrap
	//      21c2cca6cf7a65b395b7' (the space is actually included by webpack!)
	//   4) node-only modules that are ignored on the browser, e.g. 'fs (ignored)'
	//      For all these cases, it's fine to just use the same input path. No
	//      transforms needed.
	return resource;
}

module.exports = {
	devtoolModuleFilenameTemplate,
};
