import { createContext, useContext, useState, } from "react"

import {openDB, type IDBPDatabase} from "idb"

export type UseIDBOptions = {
    name: string
    version?: number
}

export function createIDB(opts: UseIDBOptions) {
    const {name, version = 1} = opts;

    return openDB(name, version)
}

const IDBContext = createContext<IDBPDatabase | null>(null)
export function useIDBContext() {
    const idb = useContext(IDBContext);
    if (!idb) {
        throw new Error("you must call `useIDBContext` within an IDBContextProvider")
    }

    return idb;
}

export function useIDBStore(storeName: string) {
    const db = useIDBContext();

}