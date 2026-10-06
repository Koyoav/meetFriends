// React 18+ warns about state updates outside act() unless the environment
// declares itself act-aware for the whole test run, not just within a single
// act() call. See https://github.com/reactwg/react-18/discussions/102.
global.IS_REACT_ACT_ENVIRONMENT = true;
