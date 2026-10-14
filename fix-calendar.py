from pathlib import Path
import re
import shutil

path = Path("src/app/calendar.tsx")

if not path.exists():
    raise SystemExit("ERROR: src/app/calendar.tsx was not found. Run this from your TaskFlow project folder.")

source = path.read_text(encoding="utf-8")
original = source

def require(condition, message):
    if not condition:
        raise SystemExit("STOP: " + message + "\nNo changes were saved.")

# Create a backup before editing.
backup = path.with_suffix(".tsx.backup")
shutil.copy2(path, backup)
print(f"Backup created: {backup}")

# 1. Remove the screen-specific desktop navigation.
desktop_start = source.find(
    "      {/* ------------------------------------------------------------------ */}\n"
    "      {/* DESKTOP TOP NAVIGATION"
)
main_area = source.find('      <View style={styles.mainArea}>', desktop_start)

require(desktop_start >= 0, "Could not find the desktop navigation section.")
require(main_area > desktop_start, "Could not find the mainArea section after desktop navigation.")

source = source[:desktop_start] + source[main_area:]

# 2. Remove the duplicate mobile hamburger button.
mobile_button_pattern = re.compile(
    r'            <Pressable\s+'
    r'style=\{styles\.mobileMenuButton\}.*?'
    r'            </Pressable>\s*',
    re.DOTALL,
)
source, mobile_count = mobile_button_pattern.subn("", source, count=1)
require(mobile_count == 1, "Could not safely identify the duplicate mobile menu button.")

# 3. Remove the screen-specific mobile drawer JSX.
drawer_marker = source.find("      {/* MOBILE DRAWER")
require(drawer_marker >= 0, "Could not find the mobile drawer section.")

drawer_start = source.rfind(
    "      {/* ------------------------------------------------------------------ */}",
    0,
    drawer_marker
)
modal_end_marker = "      </Modal>"
modal_end = source.find(modal_end_marker, drawer_marker)

require(drawer_start >= 0, "Could not find the drawer section's opening comment.")
require(modal_end > drawer_marker, "Could not find the closing Modal for the drawer.")

source = source[:drawer_start] + source[modal_end + len(modal_end_marker):]

# 4. Remove drawer state and navigation list.
source, state_count = re.subn(
    r'\n\s*const \[drawerOpen, setDrawerOpen\] = useState\(false\);\s*',
    '\n',
    source,
    count=1
)
require(state_count == 1, "Could not find the drawer state declaration.")

source, nav_count = re.subn(
    r'\nconst NAV_ITEMS = \[.*?\n\];\s*',
    '\n',
    source,
    count=1,
    flags=re.DOTALL
)
require(nav_count == 1, "Could not find the screen-specific NAV_ITEMS list.")

# 5. Remove Modal import, which is no longer used by the drawer.
source, modal_import_count = re.subn(r'^\s*Modal,\s*\n', '', source, count=1, flags=re.MULTILINE)
require(modal_import_count == 1, "Could not find the Modal import.")

# 6. Remove styles belonging only to the old desktop navigation.
desktop_style_start = source.find("  /* Desktop navigation */")
main_area_style = source.find("  mainArea: {", desktop_style_start)

require(desktop_style_start >= 0, "Could not find the desktop navigation styles.")
require(main_area_style > desktop_style_start, "Could not find mainArea styles after desktop navigation styles.")

source = source[:desktop_style_start] + source[main_area_style:]

# Remove the old mobile hamburger button style.
source, menu_style_count = re.subn(
    r'\n\s*mobileMenuButton:\s*\{.*?\n\s*\},\s*',
    '\n',
    source,
    count=1,
    flags=re.DOTALL
)
require(menu_style_count == 1, "Could not find the old mobile menu button style.")

# Remove the drawer-only styles.
drawer_style_start = source.find("  /* Drawer */")
styles_end = source.rfind("});")

require(drawer_style_start >= 0, "Could not find the drawer styles.")
require(styles_end > drawer_style_start, "Could not find the end of StyleSheet.create.")

source = source[:drawer_style_start] + source[styles_end:]

# 7. Apply TaskFlow's navy, blue, and lavender palette.
palette = {
    '#0B1F3A': '#172033',
    '#07162A': '#101828',
    '#163354': '#263653',
    '#FF7A00': '#208AEF',
    '#E96500': '#1976D2',
    '#FFF1E5': '#EAF4FF',
    '#DFAE45': '#8B7DED',
    '#FBF5E7': '#F0EDFF',
    '#F4F5F7': '#F6F8FC',
    '#10213A': '#172033',
    '#E2E6EB': '#E7ECF3',
    '#D4DAE2': '#D5DDE8',
    'rgba(255,122,0,0.13)': 'rgba(32,138,239,0.13)',
    'rgba(255,255,255,0.05)': 'rgba(255,255,255,0.05)',
    '#EFE0B9': '#DCD6FF',
}

for old, new in palette.items():
    source = source.replace(old, new)

require(source != original, "No changes were made.")
require("drawerOpen" not in source, "A drawerOpen reference remains.")
require("NAV_ITEMS" not in source, "A NAV_ITEMS reference remains.")
require("styles.drawer" not in source, "A drawer style reference remains.")
require("styles.desktopTopBar" not in source, "A desktop navigation style reference remains.")
require("styles.mobileMenuButton" not in source, "A mobile menu style reference remains.")

# Save only after all safety checks pass.
path.write_text(source, encoding="utf-8")

print("\nSUCCESS: Calendar navigation and color corrections were saved.")
print("The original file is preserved in calendar.tsx.backup.")
print("Next run: npx tsc --noEmit")
