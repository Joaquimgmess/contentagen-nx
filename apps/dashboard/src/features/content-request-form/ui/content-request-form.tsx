import { Button } from "@packages/ui/components/button";
import { defineStepper } from "@packages/ui/components/stepper";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { TalkingMascot } from "@/widgets/talking-mascot/ui/talking-mascot";
import {
   type ContentRequestFormData,
   useContentRequestForm,
} from "../lib/use-content-request-form";
import { BasicInfoStep, BasicInfoStepSubscribe } from "./basic-info-step";
import {
   ReviewSubmitStep,
   ReviewSubmitStepSubscribe,
} from "./review-submit-step";

const steps = [
   { id: "step-basic-info", title: "Basic Info" },
   { id: "step-review-submit", title: "Review & Submit" },
] as const;

const { Stepper } = defineStepper(...steps);

interface ContentRequestFormProps {
   defaultValues?: Partial<ContentRequestFormData>;
   onSubmit: (values: ContentRequestFormData) => Promise<void>;
}

export function ContentRequestForm({
   defaultValues,
   onSubmit,
}: ContentRequestFormProps) {
   const { handleSubmit, form } = useContentRequestForm({
      defaultValues,
      onSubmit,
   });

   const getMascotMessage = (step: string) => {
      switch (step) {
         case "step-basic-info":
            return "Let's start by defining what content you'd like to create!";
         case "step-review-submit":
            return "Perfect! Let's review your content request before submitting!";
         default:
            return "Let's create some amazing content!";
      }
   };

   return (
      <Stepper.Provider
         className="h-full w-full"
         labelOrientation="vertical"
         variant="horizontal"
      >
         {({ methods }) => (
            <form
               className="h-full gap-8 flex flex-col"
               onSubmit={handleSubmit}
            >
               <Stepper.Navigation>
                  {steps.map((step, idx) => {
                     const currentIdx = steps.findIndex(
                        (s) => s.id === methods.current.id,
                     );
                     const isPastOrCurrent = idx <= currentIdx;
                     return (
                        <Stepper.Step
                           className={`bg-accent!important text-accent ${!isPastOrCurrent ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
                           key={step.id}
                           of={step.id}
                           onClick={() => {
                              if (isPastOrCurrent && idx !== currentIdx) {
                                 methods.goTo(step.id);
                              }
                           }}
                        />
                     );
                  })}
               </Stepper.Navigation>

               <TalkingMascot message={getMascotMessage(methods.current.id)} />

               <Stepper.Panel className="h-full">
                  <AnimatePresence initial={false} mode="wait">
                     <motion.div
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-full space-y-4"
                        exit={{ opacity: 0, scale: 0.96 }}
                        initial={{ opacity: 0, scale: 0.96 }}
                        key={methods.current.id}
                        transition={{ duration: 0.3 }}
                     >
                        {methods.switch({
                           "step-basic-info": () => (
                              <BasicInfoStep form={form} />
                           ),
                           "step-review-submit": () => (
                              <ReviewSubmitStep form={form} />
                           ),
                        })}
                     </motion.div>
                  </AnimatePresence>
               </Stepper.Panel>

               <Stepper.Controls
                  className="flex justify-between gap-4"
                  id="navigation-controls"
               >
                  <div>
                     {!methods.isFirst && (
                        <Button
                           className="gap-4"
                           onClick={methods.prev}
                           type="button"
                           variant="outline"
                        >
                           <ChevronLeft className="w-5 h-5" />
                           Back
                        </Button>
                     )}
                  </div>
                  <div className="flex gap-4">
                     {methods.switch({
                        "step-basic-info": () => (
                           <BasicInfoStepSubscribe
                              form={form}
                              next={methods.next}
                           />
                        ),
                        "step-review-submit": () => (
                           <ReviewSubmitStepSubscribe form={form} />
                        ),
                     })}
                  </div>
               </Stepper.Controls>
            </form>
         )}
      </Stepper.Provider>
   );
}
