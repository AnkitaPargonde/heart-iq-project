import { AnimatePresence, motion } from "framer-motion";
import { Cog, LogIn, LogOut, Mic, Moon, RefreshCw, Square, Sun } from "lucide-react";
import { springs } from "../../MotionConfig";

export default function SettingsMenu({
  settingsRef,
  settingsOpen,
  setSettingsOpen,
  theme,
  onThemeToggle,
  onRestart,
  onRecordToggle,
  isRecording,
  user,
  onLogout
}) {
  const closeAndRun = (action) => {
    setSettingsOpen(false);
    action();
  };

  return (
    <div className="settings-shell" ref={settingsRef}>
      <motion.button
        type="button"
        className={`settings-button ${settingsOpen ? "active-toggle" : ""}`}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setSettingsOpen((current) => !current)}
        aria-expanded={settingsOpen}
        aria-haspopup="menu"
        aria-controls="dashboard-settings-menu"
      >
        <Cog size={18} />
        <span>Settings</span>
      </motion.button>

      <AnimatePresence>
        {settingsOpen ? (
          <motion.div
            id="dashboard-settings-menu"
            className="settings-panel"
            role="menu"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={springs.cardHover}
          >
            <button type="button" className="settings-item" role="menuitem" onClick={() => closeAndRun(onThemeToggle)}>
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "light" ? "Switch to dark mode" : "Switch to light mode"}</span>
            </button>
            <button type="button" className="settings-item" role="menuitem" onClick={() => closeAndRun(onRestart)}>
              <RefreshCw size={16} />
              <span>Restart dashboard</span>
            </button>
            <button type="button" className="settings-item" role="menuitem" onClick={() => closeAndRun(onRecordToggle)}>
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
              <span>{isRecording ? "Stop recording" : "Record heart sound"}</span>
            </button>
            <button type="button" className="settings-item" role="menuitem" onClick={() => closeAndRun(onLogout)}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
            <div className="settings-item settings-item-passive" role="note" aria-label="Login status">
              <LogIn size={16} />
              <span>{user?.mobile_number ? `Logged in as ${user.mobile_number}` : "Login required"}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
