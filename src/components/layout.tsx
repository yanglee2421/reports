import {
  alpha,
  AppBar,
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  styled,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  CloseOutlined,
  MenuOutlined,
  CalendarMonthOutlined,
  CalendarTodayOutlined,
  SettingsOutlined,
  TrainOutlined,
  ChevronRightOutlined,
  DesktopWindowsOutlined,
  QrCodeScannerOutlined,
  DarkModeOutlined,
  LightModeOutlined,
  InfoOutlined,
  TuneOutlined,
  PushPinOutlined,
} from "@mui/icons-material";
import { NavLink, useLocation, Link as RouterLink } from "react-router";
import React from "react";
import { useLocalStore } from "@/hooks/useLocalStore";

const LinkWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),

  "& a": {
    textDecoration: "none",
    color: theme.palette.text.primary,

    display: "flex",
    gap: theme.spacing(3),
    alignItem: "center",

    padding: theme.spacing(5),

    [theme.breakpoints.up("sm")]: {
      paddingInline: theme.spacing(3),
      paddingBlock: theme.spacing(3),
    },
  },
  "& a:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& a[aria-current=page]": {
    color: theme.palette.primary.main,
    backgroundColor: alpha(
      theme.palette.primary.main,
      theme.palette.action.activatedOpacity
    ),
  },
}));

const list = [
  { to: "/hxzy_hmis", label: "华兴致远HMIS", icon: <QrCodeScannerOutlined /> },
  {
    to: "/hxzy_hmis_setting",
    label: "华兴致远HMIS设置",
    icon: <TuneOutlined />,
  },
  {
    to: "/hxzy_verifies",
    label: "华兴致远日常校验",
    icon: <CalendarTodayOutlined />,
  },
  {
    to: "/detection",
    label: "现车作业",
    icon: <TrainOutlined />,
  },
  { to: "/quartors", label: "季度校验", icon: <CalendarMonthOutlined /> },
  { to: "/log", label: "日志", icon: <InfoOutlined /> },
  {
    to: "/settings",
    label: "设置",
    icon: <SettingsOutlined />,
  },
];

export const NavMenu = () => {
  return (
    <LinkWrapper>
      {list.map((i) => (
        <NavLink key={i.to} to={i.to} end>
          {i.icon}
          <Typography variant="body1" component="span">
            {i.label}
          </Typography>
          <ChevronRightOutlined sx={{ marginInlineStart: "auto" }} />
        </NavLink>
      ))}
    </LinkWrapper>
  );
};

const HEADER_SIZE_XS = 14;
const HEADER_SIZE_SM = 16;
const ASIDE_SIZE = 72;

const AuthAsideWrapper = styled("div")(({ theme }) => ({
  position: "fixed",
  zIndex: theme.zIndex.appBar - 1,
  insetInlineStart: 0,
  insetBlockStart: 0,

  inlineSize: "100dvw",
  blockSize: "100dvh",

  paddingBlockStart: theme.spacing(HEADER_SIZE_XS),
  [theme.breakpoints.up("sm")]: {
    maxInlineSize: theme.spacing(ASIDE_SIZE),

    paddingBlockStart: theme.spacing(HEADER_SIZE_SM),
  },

  overflow: "hidden",

  backgroundColor: theme.palette.background.default,
}));

const AuthAside = styled("aside")(({ theme }) => ({
  blockSize: "100%",

  overflowX: "visible",
  overflowY: "auto",
  borderInlineEnd: `1px solid ${theme.palette.divider}`,
}));

const AuthContainer = styled("div")(({ theme }) => ({
  flexDirection: "column",

  minBlockSize: "100dvh",

  paddingBlockStart: theme.spacing(HEADER_SIZE_XS),
  [theme.breakpoints.up("sm")]: {
    display: "flex",

    paddingInlineStart: theme.spacing(ASIDE_SIZE),
    paddingBlockStart: theme.spacing(HEADER_SIZE_SM),
  },
}));

const AuthMain = styled("main")(({ theme }) => ({
  padding: theme.spacing(4),
}));

const renderModeIcon = (mode: string) => {
  switch (mode) {
    case "light":
      return <LightModeOutlined />;
    case "dark":
      return <DarkModeOutlined />;
    case "system":
    default:
      return <DesktopWindowsOutlined />;
  }
};

const ModeToggle = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const mode = useLocalStore((state) => state.mode);
  const set = useLocalStore((state) => state.set);

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        {renderModeIcon(mode)}
      </IconButton>
      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            set({ mode: "light" });
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <LightModeOutlined />
          </ListItemIcon>
          <ListItemText primary="明亮" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            set({ mode: "dark" });
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <DarkModeOutlined />
          </ListItemIcon>
          <ListItemText primary="黑暗" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            set({ mode: "system" });
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <DesktopWindowsOutlined />
          </ListItemIcon>
          <ListItemText primary="系统" />
        </MenuItem>
      </Menu>
    </>
  );
};

type AuthLayoutProps = React.PropsWithChildren;

export const AuthLayout = (props: AuthLayoutProps) => {
  const [key, update] = React.useState("");

  const location = useLocation();
  const set = useLocalStore((state) => state.set);
  const alwaysOnTop = useLocalStore((state) => state.alwaysOnTop);
  const showMenuInMobile = Object.is(key, location.key);

  return (
    <>
      <AppBar
        elevation={0}
        sx={(theme) => ({
          bgcolor: "transparent",
          borderBlockEnd: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.default, 0.6),
          backdropFilter: "blur(8px)",
        })}
      >
        <Toolbar>
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              gap: 2.5,
              alignItems: "flex-end",

              "&>a": {
                textDecoration: "none",
                color: (t) => t.palette.text.primary,
              },
            }}
          >
            <RouterLink to="/">
              <Typography variant="h6">武铁紫云接口面板</Typography>
            </RouterLink>
          </Box>

          <IconButton
            onClick={() =>
              update((p) => (p === location.key ? "" : location.key))
            }
            sx={{ display: { sm: "none" } }}
          >
            {showMenuInMobile ? <CloseOutlined /> : <MenuOutlined />}
          </IconButton>
          <Box sx={{ marginInlineStart: "auto" }} />
          <IconButton
            onClick={() => {
              set((d) => {
                d.alwaysOnTop = !d.alwaysOnTop;
              });
            }}
          >
            <PushPinOutlined color={alwaysOnTop ? "primary" : "action"} />
          </IconButton>
          <ModeToggle />
        </Toolbar>
      </AppBar>
      <AuthAsideWrapper
        sx={{
          maxInlineSize: showMenuInMobile ? "none" : 0,
        }}
      >
        <AuthAside>
          <NavMenu />
        </AuthAside>
      </AuthAsideWrapper>
      <AuthContainer
        sx={{
          display: showMenuInMobile ? "none" : "flex",
        }}
      >
        <AuthMain>{props.children}</AuthMain>
      </AuthContainer>
    </>
  );
};
