📘 Documentação Completa do Sistema de Relatório de Bugs

  🎯 Visão Geral

  Sistema que captura erros da aplicação, permite usuários reportarem bugs com contexto técnico completo, e envia notificações estruturadas para Slack.

  ---
  🏗️ Arquitetura

  ┌─────────────────┐
  │   createToast   │ ← Ponto de entrada para erros
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  ErrorModal     │ ← UI para reportar bug
  │  (Zustand)      │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  React Query    │ ← Captura mutation errors
  │  Cache          │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  TRPC Mutation  │ ← submitBugReport
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Slack API      │ ← Notificação no canal #bugs
  └─────────────────┘

  ---
  📁 Estrutura de Arquivos

  src/
  ├── utils/
  │   └── create_toast.ts          # Função helper para toasts
  ├── components/ui/
  │   └── error-modal.tsx          # Modal de erro + formulário de bug report
  ├── server/
  │   └── survey/
  │       ├── router.ts            # TRPC procedures
  │       └── schema.ts            # Zod schemas de validação
  └── trpc/
      └── react.ts                 # Hook api.survey.submitBugReport

  ---
  🔧 Componentes Detalhados

  1. create_toast.ts - Entry Point

  Responsabilidade: Criar toasts e abrir modal de erro quando necessário

  import posthog from "posthog-js";
  import { toast } from "sonner";
  import { useErrorModalStore } from "@/components/ui/error-modal";

  export function createToast({
    type,
    title,
    message,
  }: {
    title?: string;
    type: "danger" | "success" | "warning";
    message: string;
  }) {
    // ✅ SUCCESS: Toast verde simples
    if (type === "success") {
      toast.success(message);
      return;
    }

    // ⚠️ WARNING: Toast amarelo no topo
    if (type === "warning") {
      toast.warning(message, { position: "top-center" });
      return;
    }

    // ❌ DANGER: Captura no PostHog + Abre modal
    posthog.capture("error-toast-opened", {
      title: title,
      description: message,
    });

    useErrorModalStore.getState().actions.openModal({
      title: title || "Ops! Ocorreu um erro",
      description: message,
    });
  }

  Fluxo de uso:
  // Em qualquer lugar da aplicação
  createToast({
    type: "danger",
    title: "Falha ao salvar",
    message: "Não foi possível salvar os dados"
  });
  // → Abre modal automaticamente

  ---
  2. error-modal.tsx - UI Component

  Responsabilidade: Exibir erro e coletar relatório do usuário

  2.1 Store (Zustand)

  type ModalState = {
    isOpen: boolean;
    title: string;
    description: string;
  };

  type Store = {
    state: ModalState | null;
    actions: {
      openModal: (values: Omit<ModalState, "isOpen">) => void;
      closeModal: () => void;
    };
  };

  export const useErrorModalStore = create<Store>((set) => ({
    state: null,
    actions: {
      openModal: (values) => set({ state: { ...values, isOpen: true } }),
      closeModal: () => set({ state: null }),
    },
  }));

  Por que Zustand?
  - Permite abrir modal de qualquer lugar sem prop drilling
  - Estado global leve e simples

  2.2 Componente Principal

  export const ErrorModal = () => {
    const { state, actions } = useErrorModalStore();
    const [showBugReport, setShowBugReport] = useState(false);
    const [bugDescription, setBugDescription] = useState("");

    const queryClient = useQueryClient();

    // TRPC Mutation
    const submitBugReport = api.survey.submitBugReport.useMutation({
      onSuccess: () => {
        createToast({
          type: "success",
          message: "Obrigado pelo feedback! Recebemos seu relato..."
        });
        setBugDescription("");
        setShowBugReport(false);
        actions.closeModal();
      },
      onError: (error) => {
        createToast({
          type: "danger",
          title: "Erro ao enviar relatório",
          message: error.message,
        });
      },
    });

    const handleSubmitBug = () => {
      if (!bugDescription.trim()) return;

      // 🔍 CAPTURA MUTATION CACHE DO REACT QUERY
      const errorMutations = queryClient
        .getMutationCache()
        .getAll()
        .filter((mutation) => mutation.state.status === "error")
        .map((mutation) => {
          return {
            key: mutation.options.mutationKey?.join(".") ?? "",
            error: mutation.state.error instanceof TRPCClientError
              ? {
                  message: mutation.state.error.message,
                  data: (() => {
                    // Remove stack trace (muito grande)
                    const { stack: _, ...dataWithoutStack } =
                      mutation.state.error.data || {};
                    return dataWithoutStack;
                  })(),
                }
              : mutation.state.error instanceof Error
                ? {
                    message: mutation.state.error.message,
                    name: mutation.state.error.name,
                  }
                : JSON.stringify(mutation.state.error),
            input: mutation.state.variables,
          };
        });

      // 📤 ENVIA PARA BACKEND
      submitBugReport.mutate({
        userReport: bugDescription,
        mutationCache: errorMutations,
        currentURL: window.location.href,
        error: {
          title: state?.title || "",
          description: state?.description || "",
        },
      });
    };

    return (
      <BaseModal open={state?.isOpen} onOpenChange={() => { /* ... */ }}>
        {showBugReport ? (
          // 📝 FORMULÁRIO DE RELATÓRIO
          <div className="flex flex-col gap-4">
            <textarea
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="Por favor, adicione mais detalhes sobre o erro..."
            />
            <Button onClick={handleSubmitBug}>
              Enviar
            </Button>
          </div>
        ) : (
          // ❌ TELA DE ERRO
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-error">{state?.title}</p>
            <p dangerouslySetInnerHTML={{ __html: state?.description ?? "" }} />
            <BugReportButton setShowBugReport={setShowBugReport} />
          </div>
        )}
      </BaseModal>
    );
  };

  2.3 Botão Inteligente

  function BugReportButton({
    setShowBugReport,
  }: {
    setShowBugReport: (value: boolean) => void;
  }) {
    const [errorMutationCache, setErrorMutationCache] = useState<Mutation[]>([]);
    const queryClient = useQueryClient();

    // ⏱️ DELAY DE 500ms para usuário ler o erro primeiro
    useEffect(() => {
      setTimeout(() => {
        setErrorMutationCache(
          queryClient
            .getMutationCache()
            .getAll()
            .filter((mutation) => mutation.state.status === "error")
        );
      }, 500);
    }, [queryClient]);

    // 🚫 Se não houver mutations com erro, não mostra botão
    if (!errorMutationCache.length) return null;

    return (
      <Button onClick={() => setShowBugReport(true)}>
        <MegaphoneIcon className="w-4 h-4" />
        Reportar este erro
      </Button>
    );
  }

  Conceito chave: React Query mantém cache de todas as mutations. Filtramos apenas as que falharam.

  ---
  3. schema.ts - Validação Zod

  Responsabilidade: Definir contrato entre frontend e backend

  import { z } from "zod";

  export const bugReportSchema = z.object({
    // Erro que foi mostrado ao usuário
    error: z.object({
      title: z.string(),
      description: z.string(),
    }),

    // Descrição escrita pelo usuário
    userReport: z.string().min(1, "Descrição do bug é obrigatória"),

    // Mutation cache do React Query
    mutationCache: z.array(
      z.object({
        key: z.string(),              // Ex: "profile.update"
        error: z.unknown(),            // Erro serializado
        input: z.unknown(),            // Input da mutation
      })
    ),

    // URL onde o erro ocorreu
    currentURL: z.string(),
  });

  Por que z.unknown()?
  - error e input podem ter estruturas variadas
  - Backend vai serializar como JSON de qualquer forma

  ---
  4. router.ts - Backend (TRPC)

  Responsabilidade: Processar relatório e enviar para Slack

  import { createTRPCRouter, protectedProcedure } from "../../server/api/trpc";
  import { sendSlackNotification } from "@/lib/slack";
  import { bugReportSchema } from "./schema";

  export const surveyRouter = createTRPCRouter({
    submitBugReport: protectedProcedure
      .input(bugReportSchema)
      .mutation(async ({ ctx, input }) => {
        // 1️⃣ BUSCA DADOS DO USUÁRIO
        const profile = await prisma.profile.findUnique({
          where: { id: ctx.profile.id },
          select: {
            email: true,
            company_name: true,
            phone: true,
            created_at: true,
            role: true,
          },
        });

        // 2️⃣ FORMATA MENSAGEM PARA SLACK
        const bugReportMessage = `
  🐛 **Bug Report**

  👤 **Usuário:**
  • Email: ${profile?.email || "N/A"}
  • Empresa: ${profile?.company_name || "N/A"}
  • Telefone: ${profile?.phone || "N/A"}
  • Plano: ${formatRoleToPlanName(profile?.role || "")}
  • ID: ${ctx.profile.id}
  • URL: ${input.currentURL}

  ❌ **Erro Original:**
  • Título: ${input.error.title}
  • Descrição: ${input.error.description}

  📝 **Relato do Usuário:**
  ${input.userReport}

  # Mutation Cache
  ${
    input.mutationCache.length > 0
      ? input.mutationCache
          .map(
            (mutation) =>
              `• **${mutation.key}**
     📥 Input: \`${JSON.stringify(
       // 🔒 FILTRO DE SEGURANÇA: Remove senhas
       mutation.input
         ? Object.fromEntries(
             Object.entries(mutation.input).filter(
               ([key]) => !["password", "confirmPassword"].includes(key)
             )
           )
         : mutation.input,
       null,
       2
     )}\`
     ❌ Error: \`${JSON.stringify(mutation.error, null, 2)}\``
          )
          .join("\n\n")
      : "Nenhum erro encontrado no cache de mutações."
  }
        `.trim();

        // 3️⃣ ENVIA PARA SLACK
        await sendSlackNotification({
          text: bugReportMessage,
          channel: "#bugs",
        });

        return { success: true };
      }),
  });

  Conceitos importantes:

  1. protectedProcedure: Requer autenticação (ctx.profile existe)
  2. input(): Valida com Zod antes de executar
  3. mutation(): Altera estado (diferente de query)
  4. ctx.profile.id: ID do usuário autenticado (vem do middleware)

  ---
  🔄 Fluxo Completo (Passo a Passo)

  Cenário: Usuário tenta atualizar perfil mas API falha

  // 1️⃣ FRONTEND: Mutation do React Query falha
  const updateProfile = api.profile.update.useMutation({
    onError: (error) => {
      // 2️⃣ Chama createToast com erro
      createToast({
        type: "danger",
        title: "Falha ao atualizar perfil",
        message: error.message
      });
    }
  });

  // 3️⃣ createToast abre o ErrorModal via Zustand
  useErrorModalStore.getState().actions.openModal({
    title: "Falha ao atualizar perfil",
    description: error.message
  });

  // 4️⃣ ErrorModal renderiza com 500ms de delay
  // Durante o delay, captura mutation cache:
  queryClient.getMutationCache().getAll()
  // Retorna:
  [
    {
      mutationKey: ["profile", "update"],
      state: {
        status: "error",
        error: TRPCClientError { message: "Validation failed" },
        variables: { name: "João", email: "joao@email.com" }
      }
    }
  ]

  // 5️⃣ Mostra botão "Reportar este erro"

  // 6️⃣ Usuário clica, escreve descrição e envia

  // 7️⃣ handleSubmitBug processa mutation cache:
  const errorMutations = [{
    key: "profile.update",
    error: { message: "Validation failed" },
    input: { name: "João", email: "joao@email.com" }
  }];

  // 8️⃣ Envia para backend via TRPC
  submitBugReport.mutate({
    userReport: "Tentei mudar meu nome mas deu erro",
    mutationCache: errorMutations,
    currentURL: "https://app.com/minha-conta",
    error: {
      title: "Falha ao atualizar perfil",
      description: "Validation failed"
    }
  });

  // 9️⃣ BACKEND: Recebe, valida com Zod, busca dados do usuário

  // 🔟 BACKEND: Formata mensagem e envia para Slack

  // 1️⃣1️⃣ SLACK: Mensagem aparece no canal #bugs com:
  // - Email, empresa, plano do usuário
  // - URL onde erro ocorreu
  // - Descrição escrita pelo usuário
  // - Input da mutation (sem senha)
  // - Erro técnico completo

  ---
  🧩 Dependências e Conceitos

  React Query (TanStack Query)

  // Mutation Cache - armazena todas as mutations
  queryClient.getMutationCache().getAll()

  // Cada mutation tem:
  {
    mutationKey: string[],        // Identificador único
    state: {
      status: "error" | "success" | "pending",
      error: Error | TRPCClientError,
      variables: unknown,         // Input passado para a mutation
      data: unknown               // Resposta (se sucesso)
    },
    options: {
      mutationFn: Function,
      onSuccess: Function,
      onError: Function
    }
  }

  Por que usar Mutation Cache?
  - Captura TODOS os erros de mutations automaticamente
  - Não precisa instrumentar cada mutation individualmente
  - Contexto completo: input + erro + chave da mutation

  ---
  TRPC + Zod

  // BACKEND: Define procedure
  export const myRouter = createTRPCRouter({
    myProcedure: protectedProcedure
      .input(mySchema)           // Valida com Zod
      .mutation(async ({ ctx, input }) => {
        // ctx.profile - usuário autenticado
        // input - validado e tipado
        return { success: true };
      }),
  });

  // FRONTEND: Hook tipado automaticamente
  const myMutation = api.myRouter.myProcedure.useMutation();
  myMutation.mutate({ /* input */ });

  Vantagens:
  - Type-safety completo (frontend ↔ backend)
  - Validação automática com Zod
  - Erros tipados (TRPCClientError)

  ---
  Zustand

  // Store global simples
  const useStore = create<State>((set) => ({
    state: null,
    actions: {
      update: (value) => set({ state: value }),
    },
  }));

  // Usar em componente
  const { state, actions } = useStore();

  // Chamar de qualquer lugar (sem hook)
  useStore.getState().actions.update(newValue);

  Por que usar aqui?
  - Permite abrir modal de qualquer lugar (até mesmo fora de componentes React)
  - Mais leve que Context API

  ---
  📊 Dados Capturados

  Do Frontend:

  - userReport: Descrição escrita pelo usuário
  - currentURL: URL onde erro ocorreu
  - error.title/description: Mensagem mostrada ao usuário
  - mutationCache[]:
    - key: Nome da mutation (ex: "profile.update")
    - input: Dados enviados (filtrado: sem senhas)
    - error: Objeto de erro completo

  Do Backend (enriquecido):

  - email: Email do usuário
  - company_name: Nome da empresa
  - phone: Telefone
  - role: Plano (BASIC_USER, PREMIUM_USER, etc)
  - created_at: Data de cadastro
  - profile.id: UUID do usuário

  Enviado para Slack:

  Tudo acima formatado em Markdown com emojis e estrutura legível.

  ---
  🔒 Segurança

  Filtros Aplicados:

  1. Frontend (error-modal.tsx linha 255-258):
  Object.fromEntries(
    Object.entries(mutation.input).filter(
      ([key]) => !["password", "confirmPassword"].includes(key)
    )
  )

  2. Stack traces removidos (linha 78-80):
  const { stack: _, ...dataWithoutStack } = error.data || {};

  ⚠️ LIMITAÇÃO ATUAL:
  - Apenas password e confirmPassword são filtrados
  - CPF, CNPJ, tokens, etc podem vazar

  ---
  🎨 UI/UX Considerations

  Delay de 500ms

  setTimeout(() => {
    setErrorMutationCache(/* ... */);
  }, 500);
  Por quê? Dá tempo do usuário ler o erro antes do botão aparecer.

  Botão condicional

  if (!errorMutationCache.length) return null;
  Por quê? Só mostra se houver contexto técnico útil.

  dangerouslySetInnerHTML

  <p dangerouslySetInnerHTML={{ __html: state?.description ?? "" }} />
  Por quê? Permite HTML no erro (ex: links, formatação). ⚠️ Risco de XSS se não sanitizado.

  ---
  📝 Schema Completo (TypeScript)

  // Payload enviado do frontend para backend
  type BugReportPayload = {
    error: {
      title: string;
      description: string;
    };
    userReport: string;
    mutationCache: Array<{
      key: string;
      error: unknown;
      input: unknown;
    }>;
    currentURL: string;
  };

  // Resposta do backend
  type BugReportResponse = {
    success: boolean;
  };

  ---
  🚀 Como Replicar em Outro Projeto

  1. Pré-requisitos

  - ✅ TRPC configurado
  - ✅ React Query configurado
  - ✅ Zod instalado
  - ✅ Zustand (opcional, pode usar Context)
  - ✅ Sistema de notificação (Slack, Discord, email, etc)

  2. Passos de Implementação

  1. Criar schema de validação (Zod)
     └─ Define o contrato do payload

  2. Criar TRPC procedure
     └─ Recebe payload, processa, notifica

  3. Criar store (Zustand ou Context)
     └─ Gerencia estado do modal

  4. Criar ErrorModal component
     └─ UI + lógica de captura de mutation cache

  5. Criar função createToast/showError
     └─ Abre modal automaticamente em erros

  6. Integrar em error boundaries/handlers
     └─ Captura erros não tratados

  3. Adaptações Necessárias

  Se não usar TRPC:
  // Substituir
  const submitBugReport = api.survey.submitBugReport.useMutation();

  // Por
  const submitBugReport = useMutation({
    mutationFn: (data) => fetch('/api/bug-report', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  });

  Se não usar Slack:
  // Substituir sendSlackNotification por:
  - Email via SendGrid/Resend
  - Discord webhook
  - Sentry custom event
  - Salvar no banco de dados

  Se não usar Zustand:
  // Criar Context
  const ErrorModalContext = createContext();

  // Provider no _app.tsx
  <ErrorModalProvider>
    {children}
  </ErrorModalProvider>

  // Usar hook
  const { openErrorModal } = useErrorModal();

  ---
  🧪 Testando

  Forçar erro para testar:

  // Em qualquer mutation
  const test = api.test.fail.useMutation({
    onError: (error) => {
      createToast({
        type: "danger",
        title: "Erro de teste",
        message: error.message
      });
    }
  });

  // Trigger
  <button onClick={() => test.mutate({})}>
    Testar Bug Report
  </button>

  Verificar Slack:

  1. Clicar botão de teste
  2. Modal abre
  3. Clicar "Reportar este erro"
  4. Escrever descrição
  5. Enviar
  6. Verificar canal #bugs no Slack

  ---
  📚 Conceitos-Chave para Replicação

  1. Mutation Cache como fonte de verdade
    - React Query já rastreia tudo
    - Apenas filtrar status === "error"
  2. Zustand para estado global leve
    - Alternativa: Context API
    - Alternativa 2: Props (se modal no root)
  3. TRPC para type-safety
    - Alternativa: REST API + fetch
    - Manter validação Zod mesmo sem TRPC
  4. Sanitização de dados sensíveis
    - Sempre filtrar antes de enviar
    - Lista de campos sensíveis
  5. Delay UX de 500ms
    - Melhora experiência
    - Dá tempo de ler erro
  6. Enriquecimento no backend
    - Frontend envia mínimo
    - Backend adiciona contexto do usuário

  ---
  Essa estrutura é framework-agnostic e pode ser adaptada para qualquer stack que use React Query + validação de schemas!
