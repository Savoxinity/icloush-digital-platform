import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Package2,
  PanelLeft,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "后台总览", path: "/admin" },
  { icon: Package2, label: "产品管理", path: "/admin/products" },
  { icon: ShoppingCart, label: "订单处理", path: "/admin/orders" },
  { icon: Users, label: "客户管理", path: "/admin/customers" },
  { icon: FileText, label: "内容发布", path: "/admin/content" },
  { icon: Search, label: "SEO 配置", path: "/admin/seo" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7f9fc_0%,#eef4ff_100%)] px-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            iCloush Console
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">登录统一管理后台</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            后台系统用于统一管理商城商品、订单、B2B客户资料，以及 iCloush LAB.、环洗朵科技、富朵朵 iCloush Care 三个官网的内容与 SEO 配置。
          </p>
          <div className="mt-8 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900">管理范围</p>
              <p className="mt-2">产品、订单、客户、内容、SEO</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900">当前进度</p>
              <p className="mt-2">已完成后台导航与模块骨架</p>
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="mt-8 h-12 w-full"
          >
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(
    (item) => location === item.path || (item.path !== "/admin" && location.startsWith(`${item.path}/`)),
  ) ?? (location === "/admin" ? menuItems[0] : undefined);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0 bg-slate-950 text-slate-100" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-white/10">
            <div className="flex w-full items-center gap-3 px-2 transition-all">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="切换导航"
              >
                <PanelLeft className="h-4 w-4 text-slate-300" />
              </button>
              {!isCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-xs uppercase tracking-[0.22em] text-slate-500">iCloush</p>
                  <p className="truncate font-semibold tracking-tight text-white">统一管理后台</p>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-3">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  location === item.path || (item.path !== "/admin" && location.startsWith(`${item.path}/`));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 font-normal text-slate-200 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/10 p-3">
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3 group-data-[collapsible=icon]:hidden">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">运营摘要</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">站点</p>
                  <p className="mt-1 font-medium text-white">4</p>
                </div>
                <div>
                  <p className="text-slate-500">模块</p>
                  <p className="mt-1 font-medium text-white">5</p>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                    <AvatarFallback className="bg-slate-800 text-xs font-medium text-slate-100">
                      {user?.name?.charAt(0).toUpperCase() || "I"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none text-white">{user?.name || "管理员"}</p>
                    <p className="mt-1.5 truncate text-xs text-slate-400">{user?.email || "已登录"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (!isCollapsed) {
              setIsResizing(true);
            }
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="text-sm font-medium text-foreground">{activeMenuItem?.label ?? "后台"}</span>
            </div>
          </div>
        ) : null}
        <main className="flex-1 bg-[linear-gradient(180deg,#f8fafc_0%,#eef3ff_100%)] p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
