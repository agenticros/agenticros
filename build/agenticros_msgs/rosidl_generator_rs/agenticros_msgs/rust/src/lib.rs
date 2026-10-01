#![allow(non_camel_case_types)]
#![allow(clippy::derive_partial_eq_without_eq)]
#![allow(clippy::upper_case_acronyms)]

#[path = "msg.rs"]
mod msg_idiomatic;
pub mod msg {
    pub use super::msg_idiomatic::*;
    pub mod rmw;
}

#[path = "srv.rs"]
mod srv_idiomatic;
pub mod srv {
    pub use super::srv_idiomatic::*;
    pub mod rmw;
}

#[path = "action.rs"]
mod action_idiomatic;
pub mod action {
    pub use super::action_idiomatic::*;
    pub mod rmw;
}
