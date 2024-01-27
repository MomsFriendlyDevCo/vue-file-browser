@MomsFriendlyDevCo/Vue-File-Browser
===================================
Pluggable fully-featured file-management module for Vue + Express.


Integration
===========

Backend
-------
Import the Express injectable into your ExpressJS project:

See [src/files.js](./src/files.js) for a full list of.

```javascript
import FileBrowser from '@momsfriendlydevco/vue-file-browser/backend';

// Initalize `app` somehow - `const app = express()` usually

// Inject the FileBrowser backend
FileBrowser({
    app, // Pass on the Express style app for decoration

    // Read in config from .env / Vite env or specify defaults
    rootPath: app.config.FILES_ROOT,
    thumbsPath: app.config.FILES_THUMBS_ROOT,
    glob: (app.config.FILES_GLOB ?? '**/*.{gif,jpg,jpeg,png,webp} | **/.gander.json').split(/\s*\|\s*/),
    meta: app.config.FILES_META ?? '.gander.json',

    // ...see ./src/files.js for full options list
});
```


Frontend
--------
Include the Vue component in your frontend wrapper code:

See [src/files.vue](./src/files.vue) for a full list of.

```vue
<script>
import FileBrowser from '@momsfriendlydevco/vue-file-browser/frontend';

export default {
	components: {
		// Injectable FileBrowser frontend component
		FileBrowser,
	},
}
</script>

<template>
	<FileBrowser
		:endpoints="{
			list: '/api/files',
		}"
	/>
</template>
```
