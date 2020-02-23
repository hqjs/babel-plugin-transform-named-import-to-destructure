# hqjs.org
Transform named import to destructure, provides better error messages for circular dependencies.

# Installation
```sh
npm install hqjs@babel-plugin-transform-named-import-to-destructure
```

# Transformation
Plugin makes destructure imports work with circular dependencies, it also work together with typescript and type metadata. Basically it tries to fail early with module assignment, catches the error and tries to assign again. With second failure it provides nicer error message.
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
let Injectable;
import * as _ref from '@angular/core';
Promise.resolve((Injectable = "Injectable" in _ref ? _ref.Injectable : _ref.default.Injectable)).then(() => (Injectable = "Injectable" in _ref ? _ref.Injectable : _ref.default.Injectable)).catch(() => console.error("Unable to resolve cyclic dependencies between module \"\" and \"@angular/core\" while requesting \"Injectable as Injectable\". Try to import \"\" before \"@angular/core\" in a parent module"))
let of;
import * as _ref2 from 'rxjs'; // Observable is only type import, while of is regular import

Promise.resolve((of = "of" in _ref2 ? _ref2.of : _ref2.default.of)).then(() => (of = "of" in _ref2 ? _ref2.of : _ref2.default.of)).catch(() => console.error("Unable to resolve cyclic dependencies between module \"\" and \"rxjs\" while requesting of as of\". Try to import \"\" before \"rxjs\" in a parent module"))

let HEROES;
import * as _ref4 from './mock-heroes';
Promise.resolve((HEROES = "HEROES" in _ref4 ? _ref4.HEROES : _ref4.default.HEROES)).then(() => (HEROES = "HEROES" in _ref4 ? _ref4.HEROES : _ref4.default.HEROES)).catch(() => console.error("Unable to resolve cyclic dependencies between module \"\" and \"./mock-heroes\" while requesting \"HEROES as HEROES\". Try to import \"\" before \"./mock-heroes\" in a parent module"))
let MessageService;
import * as _ref5 from './message.service'; // This is type import, but it is required for metadata

Promise.resolve((MessageService = "MessageService" in _ref5 ? _ref5.MessageService : _ref5.default.MessageService)).then(() => (MessageService = "MessageService" in _ref5 ? _ref5.MessageService : _ref5.default.MessageService)).catch(() => console.error("Unable to resolve cyclic dependencies between module \"\" and \"./message.service\" while requesting \"MessageService as MessageService\". Try to import \"\" before \"./message.service\" in a parent module"))

@Injectable({
  providedIn: 'root'
})
export class HeroService {
  constructor(private messageService: MessageService) {}

  getHeroes(): Observable<Hero[]> {
    this.messageService.add('HeroService: fetched heroes');
    return of(HEROES);
  }

}

```

that works nice with decorator plugin.
