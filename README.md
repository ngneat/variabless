<br />
<p align="center">
 <img width="50%" height="50%" src="./logo.svg">
</p>

[![commitizen](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)]()
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)]()
[![coc-badge](https://img.shields.io/badge/codeof-conduct-ff69b4.svg?style=flat-square)]()
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e5079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Variabless allows you to manage application wide css variables in a single source of truth. Variablesss will convert a js definitions file to css variables allowing you to use those values both in js and css files.

<hr />

## Features

✅ Convert js to css variables.  
✅ Single source of styling accross the app.  
✅ Supports JS, TS and JSON file formats.  
✅ Webpack Plugin.  
✅ Easy CSS rules creation.  

👉 See the [live demo]().

## Table of content

- [Installation](#installation)
- [Usage](#usage)
  - [CLI](#cli)
  - [Webpack Plugin](#webpack-plugin)
- [Rules Definition](#rules-definition)
  - [value](#value---string--number--object)
  - [variableName](#variablename---string--resolver)
    - [Tokenized string](#tokenized-string)
    - [Resolver function](#resolver-function)
  - [appendVariablesTo](#appendvariablesto---string)
  - [properties](#properties---propertyconfig--propertyconfig)

## Installation
Install the Variabless package via yarn or npm by running:
```bash
npm i -D variabless
yarn add -D variabless
```

## Usage
There are two ways you can use Variabless:

### CLI
Add the following scripts to your package.json file and execute when needed:

```json
{
  "variabless": "variabless -s src/theme.ts -o src/assets/styles/theme.css"
}
```
Run `npm run variabless` to generate the css file.

### Webpack plugin
The VariablessWebpackPlugin provides you with the ability to add/remove variables during development, while you're working on the project.
Just add the VariablessWebpackPlugin in your plugins list:

```javascript
// webpack.config.js
const { VariablessWebpackPlugin } = require('variabless');

module.exports = {
  plugins: [
    new VariablessWebpackPlugin({
        watch?: boolean, // listen to changes
        srcPath: 'src/theme.ts', // the variables rules file
        outputPath: 'src/theme.css', // generated css file location
    }),
  ]
};
```

<hr>

Include the generated file by Variabless in your styles:
```css
@import 'assets/styles/theme.css';
```

Add the generated file to your `.gitignore` file, there is no need to track it.

## Rules Definition
The Variabless source file exports a map of rules which defines how to create the variables:
 
```typescript
// src/theme.ts
export const coreStyles: Record<string, Rule> = {
  myVariable: {
    value: string | object;
    variableName: string | Resolver;
    appendVariablesTo?: string;
    properties: PropertyConfig | PropertyConfig[];
  },
  ...
};
```

Where each rule has the following options:

####`value` - string | number | object
The css variable value, can be either string, number or a map:

```javascript
{
  fontFamily: {
    value: 'Roboto'
  },
  blueColors: {
    value: {
      b1: 'lightblue',
      b2: 'blue',
    }   
  }
}
```

When passing a map, a variable will be created for each value.

####`variableName` - string | Resolver
The css variable name.  
When the rule has a primitive value the `variableName` should be a `string`:
```javascript
{
  fontFamily: {
    value: 'Roboto',
    variableName: 'font-family'
  },
}
``` 
Will produce:
```css
--font-family: 'Roboto'
```


When the rule's `value` is a map, we need to avoid name collisions, the `variableName` must be one of these two options:
##### Tokenized string
We can pass a string containing special tokens which are replaced during the variable's creation:
* `:valueKey`
* `:property`

The following rule: 
```javascript
{
  blueColors: {
    value: {
      b1: 'lightblue',
      b2: 'blue',
    },
    variableName: ':valueKey-color'
  },
}
``` 

Will produce the following variables:

```css
--b1-color: 'lightblue'
--b2-color: 'blue'
```
##### Resolver function
The resolver function is similar to the tokenized string but gives you more flexibility:

```typescript
type Resolver = (params: ResolverParams) => string;

interface ResolverParams {
  valueKey: string; 
  property?: string;
} 
```

The following rule: 
```javascript
{
  blueColors: {
    value: {
      b1: 'lightblue',
      b2: 'blue',
    },
    variableName: ({valueKey}) => valueKey.toUpperCase() + '-color'
  },
}
``` 

Will produce the following variables:

```css
--B1-color: 'lightblue'
--B2-color: 'blue'
```

#### `appendVariablesTo` - string
The selector hosting the generated variables, defaults to `:root`:

```css
:root {
  --font-family: 'Roboto'
  ...
}
```

#### `properties` - PropertyConfig | PropertyConfig[]
It's a common practice to put frequently used styles in shared class or attribute.   
Varibless allows you to easily create css selectors for those frequently used variables.  

Properties are defined as following:
```typescript
export interface PropertyConfig {
  prop: string | string[];
  selector: string | Resolver;
} 
```

* `prop` - The css properties to assign the variable's value to.
* `selector` - The selector that will hold the css properties.

Similar to the [variableName](#variablename---string--resolver), if the rule's value is a primitive, the selector's value 
should be a `string`. If the rule's value is a map, or the selector used for several css properties than the selector 
should be a [tokenized string](#tokenized-string) or a [resolver function](#resolver-function) to prevent collisions.

The following rule: 
```typescript
{
  fontFamily: {
    value: 'Roboto',
    variableName: 'font-family',
    properties: {
      prop: 'font-family', 
      selector: '.font-family'
    },
  },
  blueColors: {
    value: {
      b1: 'lightblue',
      b2: 'blue'
    },
    variableName: ':valueKey-color',
    property: [{
      prop: 'color',
      selector: '.:valueKey-:property'
    }, {
      prop: 'background-color',
      selector: '.:valueKey-bg'
    }],
  }
}
```

Will produce the following css:

```css
:root {
 --font-family: 'Roboto';
 --b1-color: 'lightblue';
 --b2-color: 'blue';
}

body {
  .font-family {
    font-family: var(--font-family);  
  }  
  .b1-color {
    color: var(--b1-color);  
  }  
  .b2-color {
    color: var(--b2-color);  
  }  
  .b1-bg{
    background-color: var(--b1-color);  
  }  
  .b2-bg {
    background-color: var(--b2-color);  
  }
   
}
``` 
