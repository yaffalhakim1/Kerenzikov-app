//! Desktop ownership of the Kerenzikov daemon process.

use std::path::PathBuf;

use anyhow::{Context as _, anyhow, bail};

pub fn start_process() -> anyhow::Result<waku_client::DaemonSupervisor> {
    let address = std::env::var(waku_client::DAEMON_ADDRESS_ENV)
        .ok()
        .filter(|value| !value.trim().is_empty());
    let token = std::env::var(waku_client::DAEMON_TOKEN_ENV)
        .ok()
        .filter(|value| !value.is_empty());
    match (address, token) {
        (Some(address), Some(token)) => {
            return waku_client::DaemonSupervisor::connect(address.trim(), token);
        }
        (Some(_), None) => bail!(
            "{} is set but {} is missing",
            waku_client::DAEMON_ADDRESS_ENV,
            waku_client::DAEMON_TOKEN_ENV
        ),
        (None, Some(_)) => bail!(
            "{} is set but {} is missing",
            waku_client::DAEMON_TOKEN_ENV,
            waku_client::DAEMON_ADDRESS_ENV
        ),
        (None, None) => {}
    }
    let app_settings = waku_client::persistence::load_or_create_app_settings()
        .context("could not load desktop daemon settings")?;
    waku_client::DaemonSupervisor::spawn_configured(
        &daemon_executable_path()?,
        cfg!(debug_assertions),
        app_settings.daemon_exposure,
    )
}

/// The machine's Tailscale IPv4 address, if the tailnet is up.
///
/// Asking the OS which source address it would use to reach Tailscale's
/// MagicDNS resolver is cheaper and more accurate than enumerating every
/// interface: connecting a UDP socket sends nothing, and the address the
/// kernel picks is the tailnet one exactly when Tailscale is running. When it
/// is not, the default route answers instead, so the `100.64.0.0/10` check is
/// what keeps a non-Tailscale LAN address from being reported as one.
///
/// Resolved once during app construction, alongside [local_hostname], so no
/// render frame ever touches the OS.
pub fn tailscale_address() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    // MagicDNS lives inside the tailnet's CGNAT range; no packet is sent.
    socket.connect("100.100.100.100:53").ok()?;
    let ip = match socket.local_addr().ok()?.ip() {
        std::net::IpAddr::V4(ip) => ip,
        std::net::IpAddr::V6(_) => return None,
    };
    is_tailscale_cgnat(ip).then(|| ip.to_string())
}

/// Tailscale hands out addresses from `100.64.0.0/10`, the CGNAT block. A
/// non-Tailscale LAN interface answers the probe too, so this is what stops
/// that address from being mistaken for the tailnet one.
fn is_tailscale_cgnat(ip: std::net::Ipv4Addr) -> bool {
    let [a, b, ..] = ip.octets();
    a == 100 && (64..=127).contains(&b)
}

/// Resolve the local host name once during app construction. Settings can
/// then show a useful LAN URL without touching the OS from a render frame.
pub fn local_hostname() -> Option<String> {
    #[cfg(unix)]
    {
        let mut buffer = [0_u8; 256];
        let result = unsafe { libc::gethostname(buffer.as_mut_ptr().cast(), buffer.len()) };
        if result == 0 {
            let length = buffer
                .iter()
                .position(|byte| *byte == 0)
                .unwrap_or(buffer.len());
            let hostname = String::from_utf8_lossy(&buffer[..length]).trim().to_owned();
            if !hostname.is_empty() {
                return Some(hostname);
            }
        }
    }
    // `COMPUTERNAME` is the Windows equivalent and is always set; `HOSTNAME`
    // covers the shells that export it.
    ["COMPUTERNAME", "HOSTNAME"]
        .into_iter()
        .filter_map(|name| std::env::var(name).ok())
        .map(|hostname| hostname.trim().to_owned())
        .find(|hostname| !hostname.is_empty())
}

fn daemon_executable_path() -> anyhow::Result<PathBuf> {
    if let Some(path) = std::env::var_os("WAKU_DAEMON_PATH").filter(|path| !path.is_empty()) {
        return Ok(path.into());
    }
    let executable = format!("waku-daemon{}", std::env::consts::EXE_SUFFIX);
    let current = std::env::current_exe().context("could not locate the Kerenzikov executable")?;

    // Development keeps the daemon beside Cargo's debug artifacts rather than
    // inside Waku Debug.app. The supervisor watches this file and swaps only
    // the daemon when the development watcher relinks it.
    #[cfg(debug_assertions)]
    if let Some(debug_directory) = current
        .ancestors()
        .find(|candidate| candidate.file_name().is_some_and(|name| name == "debug"))
    {
        let external = debug_directory.join(&executable);
        if external.is_file() {
            return Ok(external);
        }
    }

    let sibling = current
        .parent()
        .map(|directory| directory.join(&executable))
        .ok_or_else(|| anyhow!("Kerenzikov executable has no parent directory"))?;
    if sibling.is_file() {
        return Ok(sibling);
    }
    #[cfg(debug_assertions)]
    bail!(
        "Kerenzikov daemon was not found in Cargo's debug directory or next to the app executable: {}",
        sibling.display(),
    );
    #[cfg(not(debug_assertions))]
    bail!(
        "Kerenzikov daemon is missing next to the app executable: {}",
        sibling.display(),
    )
}

#[cfg(test)]
mod tests {
    use super::is_tailscale_cgnat;
    use std::net::Ipv4Addr;

    #[test]
    fn only_the_cgnat_block_counts_as_tailscale() {
        assert!(is_tailscale_cgnat(Ipv4Addr::new(100, 64, 0, 1)));
        assert!(is_tailscale_cgnat(Ipv4Addr::new(100, 100, 12, 8)));
        assert!(is_tailscale_cgnat(Ipv4Addr::new(100, 127, 255, 254)));
        // A plain LAN address and the neighbouring public `100.63` block must
        // not be reported as a tailnet address.
        assert!(!is_tailscale_cgnat(Ipv4Addr::new(192, 168, 1, 10)));
        assert!(!is_tailscale_cgnat(Ipv4Addr::new(100, 63, 0, 1)));
        assert!(!is_tailscale_cgnat(Ipv4Addr::new(100, 128, 0, 1)));
    }
}
