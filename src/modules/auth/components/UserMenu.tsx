"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { signOut, useSession } from "@/lib/auth-client";
import { ROUTES } from "@/lib/constants/route";

interface UserMenuProps {
    variant: "navbar" | "drawer";
    // Called after a link/action is used (e.g. to close the mobile drawer).
    onAction?: () => void;
}

/**
 * Auth area of the Navbar: Login link when logged out, avatar menu when
 * logged in, and a same-size placeholder while the session loads (no
 * "Login" flash, no layout shift).
 *
 * Menu items for Profile/Bookmarks/Settings are added in the phases that
 * build those pages — no dead links until then.
 */
export function UserMenu({ variant, onAction }: UserMenuProps) {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    const handleSignOut = async () => {
        onAction?.();
        await signOut();
        // Stay on the page; protected pages (step 6.9) re-check on refresh.
        router.refresh();
    };

    if (isPending) {
        return (
            <span
                className={`user-menu-placeholder user-menu-placeholder-${variant}`}
                aria-hidden="true"
            />
        );
    }

    if (!session) {
        return (
            <Link
                href={ROUTES.AUTH.LOGIN}
                className={`navbar-login-btn ${variant === "drawer" ? "navbar-login-btn-full" : ""}`}
                onClick={onAction}
            >
                Login
            </Link>
        );
    }

    const { name, email, image } = session.user;

    if (variant === "drawer") {
        return (
            <div className="user-menu-drawer">
                <div className="user-menu-identity">
                    <UserAvatar name={name} email={email} image={image} />
                    <div className="user-menu-identity-text">
                        <span className="user-menu-name">{name}</span>
                        <span className="user-menu-email">{email}</span>
                    </div>
                </div>
                <button type="button" className="user-menu-signout-full" onClick={handleSignOut}>
                    Log out
                </button>
            </div>
        );
    }

    return (
        <UserDropdown name={name} email={email} image={image} onSignOut={handleSignOut} />
    );
}

//  Desktop dropdown

interface UserInfo {
    name: string;
    email: string;
    image?: string | null;
}

function UserDropdown({ name, email, image, onSignOut }: UserInfo & { onSignOut: () => void }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuId = useId();
    const pathname = usePathname();

    // Close after navigation (adjusting state during render, not in an effect)
    const [prevPathname, setPrevPathname] = useState(pathname);
    if (pathname !== prevPathname) {
        setPrevPathname(pathname);
        setOpen(false);
    }

    // Close on outside click and Escape (focus returns to the avatar)
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div className="user-menu" ref={rootRef}>
            <button
                ref={buttonRef}
                type="button"
                className="user-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={`Account menu for ${name}`}
                onClick={() => setOpen((v) => !v)}
            >
                <UserAvatar name={name} email={email} image={image} />
            </button>

            {open && (
                <div id={menuId} className="user-menu-panel" role="menu">
                    <div className="user-menu-identity-text user-menu-panel-header">
                        <span className="user-menu-name">{name}</span>
                        <span className="user-menu-email">{email}</span>
                    </div>
                    <button
                        type="button"
                        role="menuitem"
                        className="user-menu-item"
                        onClick={() => {
                            setOpen(false);
                            onSignOut();
                        }}
                    >
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
}

//  Avatar with initials fallback

function UserAvatar({ name, email, image }: UserInfo) {
    const [failed, setFailed] = useState(false);
    const initials = getInitials(name || email);

    if (!image || failed) {
        return (
            <span className="user-avatar user-avatar-initials" aria-hidden="true">
                {initials}
            </span>
        );
    }

    return (
        <Image
            src={image}
            alt=""
            width={32}
            height={32}
            className="user-avatar"
            // Not run through Vercel image optimization (Hobby quota);
            // Google avatars can reject requests that send a referrer.
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
        />
    );
}

function getInitials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : value.slice(0, 2);
    return letters.toUpperCase();
}
