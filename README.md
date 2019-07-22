# hqjs.org
Transform named import to destructure

# Installation
```sh
npm install hqjs@babel-plugin-transform-named-import-to-destructure
```

# Transformation
Plugin makes destructure imports work with circular dependencies, it also work together with typescript and type metadata.
```ts
...
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs'; // Observable is only type import, while of is regular import

import { Hero } from './hero'; // That is only type import
import { HEROES } from './mock-heroes';
import { MessageService } from './message.service'; // This is type import, but it is required for metadata

@Injectable({
  providedIn: 'root',
})
export class HeroService {

  constructor(private messageService: MessageService) { }

  getHeroes(): Observable<Hero[]> {
    this.messageService.add('HeroService: fetched heroes');
    return of(HEROES);
  }
}

```

will turn into
```ts
import * as _ref from "@angular/core";

let Injectable, _ref2;

try {
  _ref2 = Object.keys(_ref).length === 1 && _ref.default ? _ref.default : _ref;
  Injectable = _ref2.Injectable;
} catch {
  Promise.resolve().then(() => {
    _ref2 = Object.keys(_ref).length === 1 && _ref.default ? _ref.default : _ref;
    Injectable = _ref2.Injectable;
  }).catch(() => console.error("Unable to resolve cyclic dependencies between module \"./hero.service.ts.map*\" and \"@angular/core.map*\" while requesting \"Injectable\". Try to change imports order in a parent module"));
}

import * as _ref3 from "rxjs";

let of, _ref4;

try {
  _ref4 = Object.keys(_ref3).length === 1 && _ref3.default ? _ref3.default : _ref3;
  of = _ref4.of;
} catch {
  Promise.resolve().then(() => {
    _ref4 = Object.keys(_ref3).length === 1 && _ref3.default ? _ref3.default : _ref3;
    of = _ref4.of;
  }).catch(() => console.error("Unable to resolve cyclic dependencies between module \"./hero.service.ts.map*\" and \"rxjs.map*\" while requesting \"of\". Try to change imports order in a parent module"));
}

import * as _ref5 from "./mock-heroes";

let HEROES, _ref6;

try {
  _ref6 = Object.keys(_ref5).length === 1 && _ref5.default ? _ref5.default : _ref5;
  HEROES = _ref6.HEROES;
} catch {
  Promise.resolve().then(() => {
    _ref6 = Object.keys(_ref5).length === 1 && _ref5.default ? _ref5.default : _ref5;
    HEROES = _ref6.HEROES;
  }).catch(() => console.error("Unable to resolve cyclic dependencies between module \"./hero.service.ts.map*\" and \"./mock-heroes.map*\" while requesting \"HEROES\". Try to change imports order in a parent module"));
}

import * as _ref7 from "./message.service";

let MessageService, _ref8;

try {
  _ref8 = Object.keys(_ref7).length === 1 && _ref7.default ? _ref7.default : _ref7;
  MessageService = _ref8.MessageService;
} catch {
  Promise.resolve().then(() => {
    _ref8 = Object.keys(_ref7).length === 1 && _ref7.default ? _ref7.default : _ref7;
    MessageService = _ref8.MessageService;
  }).catch(() => console.error("Unable to resolve cyclic dependencies between module \"./hero.service.ts.map*\" and \"./message.service.map*\" while requesting \"MessageService\". Try to change imports order in a parent module"));
}

@Injectable({
  providedIn: 'root',
})
export class HeroService {

  constructor(private messageService: MessageService) { }

  getHeroes(): Observable<Hero[]> {
    this.messageService.add('HeroService: fetched heroes');
    return of(HEROES);
  }
}

```

that works nice with decorator plugin.
