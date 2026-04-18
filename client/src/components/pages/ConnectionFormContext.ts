import { createContext, useContext } from 'react';

interface ConnectionFormContextValue {
  url: string;
  headers: Record<string, string>;
}

export const ConnectionFormContext = createContext<ConnectionFormContextValue>({
  url: '',
  headers: {},
});

export const useConnectionFormContext = () => useContext(ConnectionFormContext);
