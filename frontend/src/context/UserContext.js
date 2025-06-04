import { createContext } from 'react';

export const UserContext = createContext({
  token: null,
  setToken: () => {},
  user: null,
  setUser: () => {}
});
