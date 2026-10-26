//! Keep the widget pinned to the desktop, below normal windows.
//!
//! This is the same trick `tools/desktop_todo` uses: find the shell window
//! that hosts the desktop icons, then insert the widget directly above it.
//! Every other window therefore covers the widget, while the wallpaper does
//! not. The pin is skipped while the widget has focus, so typing stays usable.

use std::sync::atomic::{AtomicIsize, AtomicUsize, Ordering};

use windows::core::{w, PCWSTR, BOOL};
use windows::Win32::Foundation::{HWND, LPARAM, TRUE};
use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, GetClassNameW, GetForegroundWindow, IsWindow, IsWindowVisible,
    SetWindowPos, HWND_BOTTOM, HWND_NOTOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
};

static ANCHOR: AtomicIsize = AtomicIsize::new(0);
static ANCHOR_AGE: AtomicUsize = AtomicUsize::new(0);

/// Park `hwnd` above the desktop icon layer, unless it is the focused window.
pub fn pin(hwnd: HWND) {
    unsafe {
        if hwnd.is_invalid() || !IsWindow(Some(hwnd)).as_bool() {
            return;
        }
        // Never re-order the window while the user is dragging or resizing it:
        // SetWindowPos during the move loop makes the drag jump.
        if GetAsyncKeyState(VK_LBUTTON.0 as i32) < 0 {
            return;
        }
        if GetForegroundWindow() == hwnd || !IsWindowVisible(hwnd).as_bool() {
            return;
        }

        // A previous launch may have left WS_EX_TOPMOST on the window. Clear
        // it before inserting, or the widget would stay above everything.
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_NOTOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );

        let target = cached_anchor(hwnd).unwrap_or(HWND_BOTTOM);
        let _ = SetWindowPos(
            hwnd,
            Some(target),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

unsafe extern "system" fn collect_windows(hwnd: HWND, lparam: LPARAM) -> BOOL {
    unsafe {
        let list = &mut *(lparam.0 as *mut Vec<HWND>);
        list.push(hwnd);
    }
    TRUE
}

unsafe fn class_name(hwnd: HWND) -> String {
    let mut buf = [0u16; 64];
    let len = unsafe { GetClassNameW(hwnd, &mut buf) }.max(0) as usize;
    String::from_utf16_lossy(&buf[..len.min(buf.len())])
}

/// True when the window owns the desktop icon view.
unsafe fn owns_icon_view(hwnd: HWND) -> bool {
    unsafe { FindWindowExW(Some(hwnd), None, w!("SHELLDLL_DefView"), PCWSTR::null()) }.is_ok()
}

/// The window to insert behind: the nearest window above the desktop layer
/// that is not the widget itself.
unsafe fn desktop_anchor(exclude: HWND) -> Option<HWND> {
    let mut list: Vec<HWND> = Vec::new();
    if unsafe {
        EnumWindows(
            Some(collect_windows),
            LPARAM(&mut list as *mut Vec<HWND> as isize),
        )
    }
    .is_err()
    {
        return None;
    }

    // EnumWindows is ordered topmost first.
    let host = list
        .iter()
        .position(|hwnd| unsafe { owns_icon_view(*hwnd) })
        .or_else(|| list.iter().position(|hwnd| unsafe { class_name(*hwnd) } == "Progman"))?;

    list[..host]
        .iter()
        .rev()
        .copied()
        .find(|hwnd| *hwnd != exclude)
}

/// Refreshing the anchor is not free, so reuse it for a few timer ticks.
unsafe fn cached_anchor(exclude: HWND) -> Option<HWND> {
    let cached = ANCHOR.load(Ordering::Relaxed);
    let age = ANCHOR_AGE.fetch_add(1, Ordering::Relaxed);

    if cached != 0 && age % 5 != 0 {
        let anchor = HWND(cached as *mut core::ffi::c_void);
        if anchor != exclude && unsafe { IsWindow(Some(anchor)) }.as_bool() {
            return Some(anchor);
        }
    }

    match unsafe { desktop_anchor(exclude) } {
        Some(anchor) => {
            ANCHOR.store(anchor.0 as isize, Ordering::Relaxed);
            Some(anchor)
        }
        None => {
            ANCHOR.store(0, Ordering::Relaxed);
            None
        }
    }
}
