import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TBlox, TBloxFreeSpace, TBloxConectionStatus } from '../models';
import { blockchain, fula } from '@functionland/react-native-fula';

interface BloxsActionSlice {

  /**
   * Local actions
   */
  setHasHydrated: (isHydrated: boolean) => void;
  update: (model: Partial<BloxsModel>) => void,
  addBlox: (blox: TBlox) => void
  updateBlox: (blox: Partial<TBlox> & Pick<TBlox, 'peerId'>) => void
  removeBlox: (peerId: string) => void
  reset: () => void

  /**
   * Remote actions
   */
  getBloxSpace: (peerId: string, updateStore: boolean) => Promise<TBloxFreeSpace>;
  checkBloxConnection: (peerId: string) => Promise<boolean>;
}
interface BloxsModel {
  _hasHydrated: boolean;
  bloxs: Record<string, TBlox>
  bloxsConnectionStatus: Record<string, TBloxConectionStatus>
  currentBloxPeerId?: string
}
export interface BloxsModelSlice extends BloxsModel, BloxsActionSlice { }
const inittalState: BloxsModel = {
  _hasHydrated: false,
  bloxs: {},
  bloxsConnectionStatus: {},
  currentBloxPeerId: undefined
}

const createModeSlice: StateCreator<
  BloxsModelSlice,
  [],
  [['zustand/persist', Partial<BloxsModelSlice>]],
  BloxsModelSlice
> = persist(
  (set, get) => ({
    ...inittalState,
    /**
     * Local actions implpementations
     */
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    update: (model) => {
      set({
        ...model
      })
    },
    addBlox: (blox) => {
      const { bloxs: currentBloxs } = get()
      set({
        bloxs: {
          ...currentBloxs,
          [blox.peerId]: {
            ...blox
          }
        }
      })
    },
    updateBlox: (blox) => {
      const { bloxs: currentBloxs } = get()
      set({
        bloxs: {
          ...currentBloxs,
          [blox.peerId]: {
            ...currentBloxs[blox.peerId],
            ...blox
          }
        }
      })
    },
    removeBlox: (peerId: string) => {
      const { bloxs: currentBloxs } = get()
      delete currentBloxs[peerId]
      set({
        bloxs: {
          ...currentBloxs,
        }
      })
    },
    reset: () => {
      set({
        ...inittalState
      })
    },
    /**
     * Remote actions implementaions
     */
    getBloxSpace: async (peerId, updateStore = true) => {
      try {
        const { bloxs: currentBloxs } = get()
        const bloxSpace = await blockchain.bloxFreeSpace();
        if (updateStore) {
          set({
            bloxs: {
              ...currentBloxs,
              [peerId]: {
                ...currentBloxs[peerId],
                freeSpace: {
                  ...bloxSpace
                }
              }
            }
          })
        }
        return bloxSpace as TBloxFreeSpace;
      } catch (error) {
        throw error;
      }
    },
    checkBloxConnection: async (peerId) => {
      const { bloxsConnectionStatus: currentBloxsConnectionStatus } = get()
      try {
        set({
          bloxsConnectionStatus: {
            ...currentBloxsConnectionStatus,
            [peerId]: 'PENDING'
          }
        })
        const connected = await fula.checkConnection();
        set({
          bloxsConnectionStatus: {
            ...currentBloxsConnectionStatus,
            [peerId]: connected ? 'CONNECTED' : 'DISCONNECTED'
          }
        })
        return connected;
      } catch (error) {
        set({
          bloxsConnectionStatus: {
            ...currentBloxsConnectionStatus,
            [peerId]: 'DISCONNECTED'
          }
        })
        throw error;
      }
    },
  }),
  {
    name: 'bloxsModelSlice',
    version: 1,
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state.setHasHydrated(true);
      };
    },
    partialize: (state): Partial<BloxsModelSlice> => ({
      bloxs: state.bloxs
    })
  }
);

export const useBloxsStore = create<BloxsModelSlice>()((...a) => ({
  ...createModeSlice(...a),
}));
