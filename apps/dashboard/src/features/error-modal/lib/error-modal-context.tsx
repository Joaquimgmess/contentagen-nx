import type { ReactNode } from "react";
import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useState,
} from "react";
import { registerErrorModalOpener } from "./create-toast";

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

   useEffect(() => {
      registerErrorModalOpener(openModal);
   }, [openModal]);

   const value = useMemo(
      () => ({
         actions: {
            closeModal,
            openModal,
         },
         state,
      }),
      [state, openModal, closeModal],
   );

   return (
      <ErrorModalContext.Provider value={value}>
         {children}
      </ErrorModalContext.Provider>
   );
};
