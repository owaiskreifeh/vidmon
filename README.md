# Vidmon

Video UX monitor tool, Catch long waiting time or bad loading behaviour

## Usage

### Install

`$ npm i owaiskreifeh/vidmon`

### Basic usage

```js
import { Vidmon, HTMLAdapter } from 'vidmon'

const options = {
    // time thershold between timeupdate events, if we didn't receive timeupdate event before
    // event of type VISUAL_STALL wil be fired
    timeupdateThreshold: 10 * 1000, // default 10sec

    // time thershold between first play event and first timeupdate event
    // if the join time exceded this limit
    // event of type LONG_JOIN_TIME will be fired
    jointimeThershold: 30 * 1000, // default 30sec

    // time thershold between waiting event and next timeupdate event
    // if the join time exceded this limit
    // event of type LONG_WAITING_TIME will be fired
    playAfterWaitingThershold: 5 * 1000, // default 30sec

    // in this time interval if we get more than 3 waiting events in a row
    // event of type MULTI_WAITING_IN_ROW will be fired
    waitingTSDiffThershold: 60 * 1000, // default 30sec
};
const vidmon = new Vidmon(new HTMLAdapter(videoElement), options);
vidmon.start();
```

### Listen to events

#### Access event types:

```js
Vidmon.Events;
```

Events:

```js
static EVENTS = {
    LONG_JOIN_TIME: "long-join-time",
    VISUAL_STALL: "visual-stall",
    LONG_WAITING_TIME: "long-waiting-time",
    MULTI_WAITING_IN_ROW: "multi-waiting-in-row",
};
```

#### Usage

```js
// Subscribe
vidmon.on(Vidmon.EVENTS.LONG_JOIN_TIME, () => {
    // do something on event of long joining time
});


// Subscribe then destroy after first event 
vidmon.once(Vidmon.EVENTS.LONG_JOIN_TIME, () => {
    // do something on event of long joining time
});

// Unubscribe
vidmon.off(Vidmon.EVENTS.LONG_JOIN_TIME, () => {
    // do something on event of long joining time
});
```

### Access Events timeline

```js
vidmon.playerEventsLogs;
```

### Debugging

Set log level

```js
vidmon.logLevel = Vidmon.LOG_LEVELS.WARNING;
```

Log levels

```js
static LOG_LEVELS = {
    DISABLED: 0,
    ERROR: 1,
    WARNING: 2,
    INFO: 3,
    DEBUG: 4,
    VERBOSE: 5,
};
```

## Extending Adapters

Check how to use and make your own adapter [Here](adapter.md)

