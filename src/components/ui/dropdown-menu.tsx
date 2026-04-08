"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { ChevronRightIcon, CheckIcon } from "lucide-react"
import { ParticleBurst } from "./particle-burst"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showParticles, setShowParticles] = React.useState(false)
  const [particleOrigin, setParticleOrigin] = React.useState({ x: 0, y: 0 })
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-open") {
          const target = mutation.target as HTMLElement
          const open = target.hasAttribute("data-open")
          
          if (!open && isOpen) {
            const rect = contentRef.current?.getBoundingClientRect()
            if (rect) {
              setParticleOrigin({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              })
              setShowParticles(true)
              setTimeout(() => setShowParticles(false), 100)
            }
          }
          
          setIsOpen(open)
        }
      })
    })

    if (contentRef.current) {
      observer.observe(contentRef.current, { attributes: true })
      setIsOpen(contentRef.current.hasAttribute("data-open"))
    }

    return () => observer.disconnect()
  }, [isOpen])

  return (
    <>
      <ParticleBurst 
        trigger={showParticles} 
        origin={particleOrigin}
        particleCount={6}
      />
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          className="isolate z-50 outline-none"
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
        >
          <MenuPrimitive.Popup
            ref={contentRef}
            data-slot="dropdown-menu-content"
            className={cn(
              "z-50 max-h-[300px] w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl p-1 text-popover-foreground outline-none",
              "bg-[var(--glass-bg)] backdrop-blur-[12px] saturate-[1.2]",
              "border border-[var(--glass-border-color)]",
              "shadow-[var(--panel-shadow)]",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              className
            )}
            {...props}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isOpen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
              transition={{
                duration: isOpen ? 0.2 : 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <motion.div
                initial="hidden"
                animate={isOpen ? "visible" : "exit"}
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.03,
                    },
                  },
                  exit: {
                    transition: {
                      staggerChildren: 0.02,
                      staggerDirection: -1,
                    },
                  },
                }}
              >
                {props.children}
              </motion.div>
            </motion.div>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      }}
      transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.01 }}
    >
      <MenuPrimitive.Item
        data-slot="dropdown-menu-item"
        data-inset={inset}
        data-variant={variant}
        className={cn(
          "group/dropdown-menu-item relative flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm text-[var(--foreground)] outline-hidden select-none",
          "transition-colors duration-150",
          "hover:bg-[var(--surface-hover)] hover:text-foreground",
          "not-data-[variant=destructive]:hover:**:text-foreground",
          "data-inset:pl-7",
          "data-[variant=destructive]:text-destructive data-[variant=destructive]:hover:bg-destructive/10 data-[variant=destructive]:hover:text-destructive",
          "data-disabled:pointer-events-none data-disabled:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
          className
        )}
        {...props}
      />
    </motion.div>
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm outline-hidden select-none",
        "transition-colors duration-150",
        "hover:bg-[var(--surface-hover)] hover:text-foreground not-data-[variant=destructive]:hover:**:text-foreground data-inset:pl-7 data-popup-open:bg-[var(--surface-hover)] data-popup-open:text-foreground data-open:bg-[var(--surface-hover)] data-open:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("w-auto min-w-[96px]", className)}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      }}
      transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.01 }}
    >
      <MenuPrimitive.CheckboxItem
        data-slot="dropdown-menu-checkbox-item"
        data-inset={inset}
        className={cn(
          "relative flex cursor-pointer items-center gap-1.5 rounded-md py-2 pr-8 pl-3 text-sm text-[var(--foreground)] outline-hidden select-none",
          "transition-colors duration-150",
          "hover:bg-[var(--surface-hover)] hover:text-foreground hover:**:text-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        checked={checked}
        {...props}
      >
        <span
          className="pointer-events-none absolute right-2 flex items-center justify-center"
          data-slot="dropdown-menu-checkbox-item-indicator"
        >
          <MenuPrimitive.CheckboxItemIndicator>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <CheckIcon />
            </motion.div>
          </MenuPrimitive.CheckboxItemIndicator>
        </span>
        {children}
      </MenuPrimitive.CheckboxItem>
    </motion.div>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      }}
      transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.01 }}
    >
      <MenuPrimitive.RadioItem
        data-slot="dropdown-menu-radio-item"
        data-inset={inset}
        className={cn(
          "relative flex cursor-pointer items-center gap-1.5 rounded-md py-2 pr-8 pl-3 text-sm text-[var(--foreground)] outline-hidden select-none",
          "transition-colors duration-150",
          "hover:bg-[var(--surface-hover)] hover:text-foreground hover:**:text-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        {...props}
      >
        <span
          className="pointer-events-none absolute right-2 flex items-center justify-center"
          data-slot="dropdown-menu-radio-item-indicator"
        >
          <MenuPrimitive.RadioItemIndicator>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <CheckIcon />
            </motion.div>
          </MenuPrimitive.RadioItemIndicator>
        </span>
        {children}
      </MenuPrimitive.RadioItem>
    </motion.div>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-hover/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
