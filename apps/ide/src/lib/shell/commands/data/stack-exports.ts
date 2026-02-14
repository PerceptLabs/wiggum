/**
 * Virtual file listing of @wiggum/stack exports
 * Derived from packages/stack/src/index.ts
 */
export const STACK_EXPORTS = `@wiggum/stack — Available exports

COMPONENTS (import from '@wiggum/stack'):

  Layout & Structure:
    Accordion, AccordionItem, AccordionTrigger, AccordionContent
    AspectRatio
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
    Collapsible, CollapsibleTrigger, CollapsibleContent
    Resizable, ResizablePanel, ResizablePanelGroup, ResizableHandle
    ScrollArea, ScrollBar
    Separator
    Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem
    Tabs, TabsList, TabsTrigger, TabsContent

  Forms & Input:
    Button
    ButtonGroup
    Checkbox
    Field
    Form, FormField, FormItem, FormLabel, FormControl, FormMessage
    Input
    InputGroup
    InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator
    Label
    RadioGroup, RadioGroupItem
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup
    Slider
    Switch
    Textarea
    Toggle
    ToggleGroup, ToggleGroupItem

  Data Display:
    Avatar, AvatarImage, AvatarFallback
    Badge
    Calendar
    Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext
    Chart (ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend)
    Empty
    Item
    Kbd
    Progress
    Skeleton
    Spinner
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter

  Feedback & Alerts:
    Alert, AlertTitle, AlertDescription
    AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
      AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
      AlertDialogAction, AlertDialogCancel
    Sonner (toast notifications — import { Toaster, toast } from '@wiggum/stack')

  Overlays & Menus:
    Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem
    ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem
    Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
    Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
      DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup
    HoverCard, HoverCardTrigger, HoverCardContent
    Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem
    NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent
    Popover, PopoverTrigger, PopoverContent
    Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription
    Tooltip, TooltipTrigger, TooltipContent, TooltipProvider

  Navigation:
    Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator
    Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext

HOOKS:
    useDebounce, useDebouncedCallback
    useDisclosure
    useLocalStorage
    useMediaQuery, useIsMobile, useIsTablet, useIsDesktop
    usePrefersDarkMode, usePrefersReducedMotion
    useClickOutside, useClickOutsideMultiple
    useCopyToClipboard
    useMounted, useIsMountedRef, useSafeState, useUpdateEffect

UTILITIES:
    cn                    Class name merging (tailwind-merge + clsx)
    formatDate, formatDateRelative, formatDateRelativeToToday
    truncate, capitalize, kebabCase, camelCase
    randomId, clamp, sleep
    isBrowser, getPlatform
    formatBytes, debounce, throttle

Usage: import { Button, Card, CardContent, Input } from '@wiggum/stack'
Icons: import { ArrowRight, Check, Star } from 'lucide-react'
`
