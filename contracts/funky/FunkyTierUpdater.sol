// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFunkyRaveTierTarget {
    function update_holding_date(address user, uint16 holdingDate, bytes32 reasonCode, bytes32 batchId) external;
    function holdingDate(address user) external view returns (uint16);
}

contract FunkyTierUpdater {
    bytes32 public constant REASON_REGULAR_SYNC = keccak256("REGULAR_SYNC");

    address public immutable funkyToken;
    address public owner;
    mapping(address => bool) public isRelayer;

    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event RelayerUpdated(address indexed relayer, bool enabled);
    event HoldingDateSyncRequested(
        address indexed user,
        uint16 holdingDate,
        bytes32 indexed reasonCode,
        bytes32 indexed batchId,
        address relayer
    );

    error InvalidAddress();
    error NotOwner();
    error NotRelayer();
    error InvalidReasonCode();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (!isRelayer[msg.sender]) revert NotRelayer();
        _;
    }

    constructor(address tokenAddress, address initialOwner, address initialRelayer) {
        if (tokenAddress == address(0) || initialOwner == address(0) || initialRelayer == address(0)) {
            revert InvalidAddress();
        }

        funkyToken = tokenAddress;
        owner = initialOwner;
        isRelayer[initialRelayer] = true;

        emit OwnershipTransferred(address(0), initialOwner);
        emit RelayerUpdated(initialRelayer, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function setRelayer(address relayer, bool enabled) external onlyOwner {
        if (relayer == address(0)) revert InvalidAddress();
        isRelayer[relayer] = enabled;
        emit RelayerUpdated(relayer, enabled);
    }

    function syncHoldingDate(address user, uint16 newHoldingDate, bytes32 batchId) external onlyRelayer {
        IFunkyRaveTierTarget(funkyToken).update_holding_date(user, newHoldingDate, REASON_REGULAR_SYNC, batchId);
        emit HoldingDateSyncRequested(user, newHoldingDate, REASON_REGULAR_SYNC, batchId, msg.sender);
    }

    function syncHoldingDateWithReason(
        address user,
        uint16 newHoldingDate,
        bytes32 reasonCode,
        bytes32 batchId
    ) external onlyRelayer {
        if (reasonCode == bytes32(0) || reasonCode == REASON_REGULAR_SYNC) revert InvalidReasonCode();
        IFunkyRaveTierTarget(funkyToken).update_holding_date(user, newHoldingDate, reasonCode, batchId);
        emit HoldingDateSyncRequested(user, newHoldingDate, reasonCode, batchId, msg.sender);
    }

    function holdingDate(address user) external view returns (uint16) {
        return IFunkyRaveTierTarget(funkyToken).holdingDate(user);
    }
}
