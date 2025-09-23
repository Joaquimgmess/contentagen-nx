import { Button } from "@packages/ui/components/button";
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
} from "@packages/ui/components/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import { menuItems } from "../data/menu-items";

export function MobileMenu() {
   const [open, setOpen] = useState(false);

   return (
      <div className="md:hidden">
         <Button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            size="icon"
            variant="outline"
         >
            <Menu className="size-6" />
         </Button>
         <Sheet onOpenChange={setOpen} open={open}>
            <SheetContent side="right" className="space-y-4">
               <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                     Explore our features and services
                  </SheetDescription>
               </SheetHeader>

               <ul className="space-y-4 text-base px-4">
                  {menuItems.map((item) => (
                     <li key={item.href}>
                        <a
                           className="text-muted-foreground hover:text-accent-foreground block duration-150"
                           href={item.href}
                           onClick={() => setOpen(false)}
                        >
                           <span>{item.name}</span>
                        </a>
                     </li>
                  ))}
               </ul>

               <div className="px-4 w-full mt-auto">
                  <Button variant="outline" className="w-full">
                     <a
                        href="https://app.contentagen.com/auth/sign-in"
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        Get Started
                     </a>
                  </Button>
               </div>
            </SheetContent>
         </Sheet>
      </div>
   );
}
