/**
 * Icon dùng chung (lucide-react), đặt tên theo vai trò trong app, map theo bộ `I` của
 * prototypes/shared/kit.js (tên khoá prototype ghi ở cuối dòng). Màn hình import từ đây
 * để cả app dùng cùng một icon cho cùng một ý.
 * Chưa có: `google` (logo thương hiệu, lucide không có) — dựng khi làm màn đăng nhập.
 * Lệch nhẹ về nét: `pause` (lucide vẽ hai khối, prototype hai nét), `flag` (lucide cờ lượn sóng).
 */
export {
  Check as CheckIcon, // check
  Minus as MinusIcon, // minus
  Plus as PlusIcon, // plus
  Ellipsis as MoreIcon, // more
  List as PlansIcon, // list
  ChevronUp as UpIcon, // up
  ChevronDown as DownIcon, // down
  ChevronLeft as BackIcon, // left
  ChevronRight as ChevronIcon, // right
  X as CloseIcon, // x
  Menu as MenuIcon, // menu
  Link as LinkIcon, // link
  ArrowLeftRight as SwapIcon, // swap
  Trash as TrashIcon, // trash
  Search as SearchIcon, // search
  WifiOff as OfflineIcon, // off
  CloudCheck as SyncedIcon, // cloud
  Play as PlayIcon, // play
  PenLine as EditIcon, // edit
  Copy as CopyIcon, // copy
  GripVertical as GripIcon, // grip
  CircleAlert as AlertIcon, // alert
  Share as ShareIcon, // share
  RotateCw as RefreshIcon, // refresh
  Mail as MailIcon, // mail
  Lock as LockIcon, // lock
  Eye as EyeIcon, // eye
  Moon as MoonIcon, // moon
  Flag as FlagIcon, // flag
  Weight as ScaleIcon, // scale (cân cơ thể)
  ChartLine as ProgressIcon, // chart
  History as HistoryIcon, // history
  Settings as SettingsIcon, // gear
  Dumbbell as ExerciseIcon, // dumbbell
  Calendar as TodayIcon, // calendar
  LogOut as LogoutIcon, // logout
  Pause as PauseIcon, // pause
  Target as TargetIcon, // target
  ArrowDownToLine as DownloadIcon, // download
  User as MeIcon, // user
  Clock as AddRestIcon, // plus30 (bộ I trong prototypes/workout-log)
  SkipForward as SkipIcon, // skip (bộ I trong prototypes/workout-log)
} from 'lucide-react';
