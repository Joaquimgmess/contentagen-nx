import {
   createContext,
   useContext,
   useState,
   useCallback,
   useMemo,
   useEffect,
} from "react";
import type { ReactNode } from "react";
import { registerErrorModalOpener } from "@packages/utils/create-toast";

type ModalState = {
   isOpen: boolean;
   title: string;
   description: string;
};

interface ErrorModalContextType {
   state: ModalState | null;
   actions: {
      openModal: (values: Omit<ModalState, "isOpen">) => void;
      closeModal: () => void;
   };
}

const ErrorModalContext = createContext<ErrorModalContextType | null>(null);

export const useErrorModalStore = () => {
   const context = useContext(ErrorModalContext);
   if (!context) {
      throw new Error(
         "useErrorModalStore must be used within ErrorModalProvider",
      );
   }
   return context;
};

export const ErrorModalProvider = ({ children }: { children: ReactNode }) => {
   const [state, setState] = useState<ModalState | null>(null);

   const openModal = useCallback((values: Omit<ModalState, "isOpen">) => {
      setState({ ...values, isOpen: true });
   }, []);

   const closeModal = useCallback(() => {
      setState(null);
   }, []);

   // Register the openModal function with the global createToast utility
   useEffect(() => {
      registerErrorModalOpener(openModal);
   }, [openModal]);

   const value = useMemo(
      () => ({
         state,
         actions: {
            openModal,
            closeModal,
         },
      }),
      [state, openModal, closeModal],
   );

   return (
      <ErrorModalContext.Provider value={value}>
         {children}
      </ErrorModalContext.Provider>
   );
};
