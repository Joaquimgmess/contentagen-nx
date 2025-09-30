import {
   createContext,
   useContext,
   useState,
   useCallback,
   useMemo,
} from "react";
import type { ReactNode } from "react";

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

// Helper para acessar fora de componentes React (como no create-toast)
export const getErrorModalStore = (() => {
   let currentContext: ErrorModalContextType | null = null;

   return {
      set: (context: ErrorModalContextType) => {
         currentContext = context;
      },
      getState: () => {
         if (!currentContext) {
            throw new Error("ErrorModalContext not initialized");
         }
         return currentContext;
      },
   };
})();

// Hook interno para registrar o contexto globalmente
export const useRegisterErrorModal = () => {
   const context = useErrorModalStore();

   // Registra o contexto globalmente para uso fora de componentes React
   useMemo(() => {
      getErrorModalStore.set(context);
   }, [context]);
};
