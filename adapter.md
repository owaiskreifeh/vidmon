# Vidmon Adapters 

Adapters are a way to unify event shape and it makes the integration with new player much easier

## Usage 

```js 
import { Vidmon, HTMLAdapter } from 'vidmon'
const vidmon = new Vidmon(new HTMLAdapter(videoElement), options);
```

## Adapters

- [X] HTMLAdapter: HTML5 Video Player, // Web native HTML5
- [ ] TizenAVAdapter: Tizen AV Player, // Tizen
- [ ] AppleAVAdapter: Apple AV Play, // iOS
- [ ] AndroidExoAdapter: Android Exo Player, // Android

## Create new adapter

1. Extend `Adapter` class 
    You can find it in `src/Adapters/Adapter.js`
2. Implement both methods in your adapter class

    ```js
    attachListeners = (callback) => {};
    detachListeners = () => {};
    ```

3. `attachListeners` should subscribe to all available events fired from the player
4. `detachListeners` should unsubscribe to all events