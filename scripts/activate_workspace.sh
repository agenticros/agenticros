#!/bin/bash
# activate_workspace.sh - Cross-platform workspace activation for AgenticROS
#
# DESCRIPTION:
#   This script sets up the complete development environment for the AgenticROS project.
#   It supports both Ubuntu (venv + native ROS2) and macOS (mamba + RoboStack).
#   The script handles platform detection and activates the appropriate environment type.
#
# USAGE:
#   source activate_workspace.sh [env_name] [ros_distro]
#
# PARAMETERS:
#   env_name     Optional. Name of the environment to activate.
#                Default: ros_env
#   ros_distro   Optional. ROS2 distribution to use.
#                Default: humble
#
# EXAMPLES:
#   # Use defaults (ros_env, jazzy)
#   source scripts/activate_workspace.sh
#
#   # Use specific environment name
#   source scripts/activate_workspace.sh my_ros_env
#
#   # Use specific ROS distribution
#   source scripts/activate_workspace.sh ros_env humble
#
# NOTE:
#   This script must be SOURCED, not executed, to modify the current shell environment.

# Check if script is being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Error: This script must be sourced, not executed."
    echo "Usage: source $(basename ${BASH_SOURCE[0]}) [env_name] [ros_distro]"
    exit 1
fi

# Default values
DEFAULT_ENV_NAME="ros_env"
DEFAULT_ROS_DISTRO="humble"
ENV_NAME="${1:-$DEFAULT_ENV_NAME}"
ROS_DISTRO="${2:-$DEFAULT_ROS_DISTRO}"

# Find the repository root
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROS2_WS_PATH="$REPO_ROOT/ros2_ws"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Platform detection
detect_platform() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt &> /dev/null; then
            PLATFORM="ubuntu"
        else
            log_error "Linux platform detected but apt not found. Only Ubuntu/Debian supported."
            return 1
        fi
    else
        log_error "Unsupported platform: $OSTYPE"
        return 1
    fi
}

# Check environment exists for Ubuntu (venv)
check_ubuntu_env() {
    local venv_path="$REPO_ROOT/$ENV_NAME"
    if [ ! -d "$venv_path" ]; then
        log_error "Virtual environment not found at $venv_path"
        echo ""
        echo "Please run the setup script first:"
        echo "  ./scripts/setup_workspace.sh --env-name $ENV_NAME --ros-distro $ROS_DISTRO"
        return 1
    fi
}

# Check environment exists for macOS (conda)
check_macos_env() {
    if [[ -n "$CONDA_DEFAULT_ENV" && "$CONDA_DEFAULT_ENV" == "$ENV_NAME" ]]; then
        log_info "Already in target conda environment '$ENV_NAME'"
        return 0
    fi

    if ! command -v mamba &> /dev/null && ! command -v conda &> /dev/null; then
        log_error "Neither mamba nor conda found!"
        echo ""
        echo "Please run the setup script first:"
        echo "  ./scripts/setup_workspace.sh --env-name $ENV_NAME --ros-distro $ROS_DISTRO"
        return 1
    fi

    local manager="mamba"
    if ! command -v mamba &> /dev/null; then
        manager="conda"
    fi

    if ! $manager env list | grep -q "\s$ENV_NAME\s"; then
        log_error "Conda environment '$ENV_NAME' not found!"
        echo ""
        echo "Please run the setup script first:"
        echo "  ./scripts/setup_workspace.sh --env-name $ENV_NAME --ros-distro $ROS_DISTRO"
        return 1
    fi
}

# Check if already in correct conda environment
check_conda_env_status() {
    if [[ -n "$CONDA_DEFAULT_ENV" ]]; then
        if [[ "$CONDA_DEFAULT_ENV" == "$ENV_NAME" ]]; then
            log_info "Already in target environment '$ENV_NAME'"
            return 0
        else
            log_warning "Currently in environment '$CONDA_DEFAULT_ENV', will switch to '$ENV_NAME'"
            return 1
        fi
    fi
    return 1
}

# Activate Ubuntu environment
activate_ubuntu() {
    local venv_path="$REPO_ROOT/$ENV_NAME"

    log_info "[1/3] Activating virtual environment..."
    source "$venv_path/bin/activate"

    log_info "[2/3] Sourcing ROS2 environment..."
    if [ -f "/opt/ros/$ROS_DISTRO/setup.bash" ]; then
        source "/opt/ros/$ROS_DISTRO/setup.bash"
    else
        log_error "ROS2 $ROS_DISTRO not found at /opt/ros/$ROS_DISTRO"
        return 1
    fi

    log_info "[3/3] Sourcing workspace overlay..."
    if [ -f "$ROS2_WS_PATH/install/setup.bash" ]; then
        source "$ROS2_WS_PATH/install/setup.bash"
    else
        log_warning "Workspace not built yet. Run: cd $ROS2_WS_PATH && colcon build --symlink-install"
    fi
}

# Activate macOS environment
activate_macos() {
    local manager="mamba"
    if ! command -v mamba &> /dev/null; then
        manager="conda"
    fi

    if check_conda_env_status; then
        log_info "[1/2] Already in conda environment '$ENV_NAME', skipping activation..."
    else
        log_info "[1/2] Activating conda environment '$ENV_NAME'..."
        eval "$($manager shell hook)"
        $manager activate "$ENV_NAME"
    fi

    if ! command -v ros2 &> /dev/null; then
        log_error "ROS2 not available in environment. Check RoboStack installation."
        return 1
    fi

    log_info "[2/2] Sourcing workspace overlay..."
    if [ -f "$ROS2_WS_PATH/install/setup.bash" ]; then
        source "$ROS2_WS_PATH/install/setup.bash"
    else
        log_warning "Workspace not built yet. Run: cd $ROS2_WS_PATH && colcon build --symlink-install"
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying environment..."

    if ! command -v ros2 &> /dev/null; then
        log_error "ROS2 command not available"
        return 1
    fi

    local python_path=$(which python3)
    log_info "Python: $python_path"

    # Check for agenticros packages
    for pkg in agenticros_msgs agenticros_discovery agenticros_agent; do
        if ros2 pkg list 2>/dev/null | grep -q "$pkg"; then
            log_success "Package found: $pkg"
        else
            log_warning "Package not found: $pkg (workspace may need to be built)"
        fi
    done

    return 0
}

# Main execution
main() {
    echo "======================================"
    echo "AgenticROS Workspace Activation"
    echo "======================================"
    echo ""

    if ! detect_platform; then
        return 1
    fi

    log_info "Platform detected: $PLATFORM"
    log_info "Environment name: $ENV_NAME"
    log_info "ROS2 distribution: $ROS_DISTRO"
    log_info "Repository root: $REPO_ROOT"
    echo ""

    case $PLATFORM in
        ubuntu)
            if ! check_ubuntu_env; then
                return 1
            fi
            if ! activate_ubuntu; then
                return 1
            fi
            ;;
        macos)
            if ! check_macos_env; then
                return 1
            fi
            if ! activate_macos; then
                return 1
            fi
            ;;
        *)
            log_error "Unsupported platform: $PLATFORM"
            return 1
            ;;
    esac

    echo ""

    if verify_setup; then
        log_success "Environment verification passed!"
    else
        log_warning "Environment verification had issues, but activation completed"
    fi

    echo ""
    log_success "Workspace activation complete!"
    echo ""
    echo "Environment Details:"
    echo "  Platform:     $PLATFORM"
    echo "  Environment:  $ENV_NAME"
    echo "  ROS2 Distro:  $ROS_DISTRO"
    echo "  Python:       $(which python3)"
    echo "  Workspace:    $ROS2_WS_PATH"
    echo ""
    echo "Ready for development! You can now:"
    echo "  - Build packages:  cd ros2_ws && colcon build --symlink-install"
    echo "  - Run discovery:   ros2 run agenticros_discovery discovery_node"
    echo "  - Run agent:       ros2 run agenticros_agent agent_node"
    echo "  - List topics:     ros2 topic list"
    echo ""
}

main
