// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title WaqfRegistry
/// @author WaqfChain
/// @notice Registry for tokenized Waqf (Islamic endowment) assets.
///         Enforces Shariah principles of perpetuity (ta'bīd), irrevocability (luzūm),
///         and purpose-restricted disbursement through on-chain rules.
/// @dev    The waqf corpus is permanently locked once created. No function in this
///         contract can transfer ownership, withdraw, or delete a registered asset.
contract WaqfRegistry is Ownable {
    // ─── Types ────────────────────────────────────────────────────────────

    /// @notice Represents a tokenized Waqf (endowment) asset.
    /// @dev    Fields `name`, `beneficiaryCategory`, and `trustee` are set once at
    ///         creation and can never be modified, enforcing the Shariah principle of
    ///         **luzūm** (irrevocability) — the waqf purpose is fixed at founding.
    struct WaqfAsset {
        uint256 id;
        string name;
        string description;
        string beneficiaryCategory;
        uint256 fundingGoal;
        uint256 totalDonated;
        address trustee;
        bool isActive;
    }

    // ─── State ────────────────────────────────────────────────────────────

    /// @notice Auto-incrementing identifier for the next registered asset.
    uint256 public nextAssetId;

    /// @notice Mapping from asset ID to its WaqfAsset record.
    mapping(uint256 => WaqfAsset) public assets;

    /// @notice Tracks cumulative donation amount per donor per asset.
    /// @dev    `donations[assetId][donor]` → total wei contributed by that donor.
    mapping(uint256 => mapping(address => uint256)) public donations;

    /// @notice Registry of addresses approved to be assigned as trustees.
    /// @dev    Only the contract owner can add or remove entries.
    mapping(address => bool) public approvedTrustees;

    // ─── Events ───────────────────────────────────────────────────────────

    /// @notice Emitted when a new Waqf asset is registered on-chain.
    /// @param id                  Unique asset identifier
    /// @param name                Human-readable name of the endowment
    /// @param beneficiaryCategory Category of beneficiaries (e.g. "education", "healthcare")
    /// @param trustee             Address authorized to disburse funds
    /// @param fundingGoal         Target funding amount in wei
    event AssetCreated(
        uint256 indexed id,
        string name,
        string beneficiaryCategory,
        address indexed trustee,
        uint256 fundingGoal
    );

    /// @notice Emitted when a donation is received for a Waqf asset.
    /// @param assetId  ID of the receiving asset
    /// @param donor    Address of the donor
    /// @param amount   Donation amount in wei
    event DonationReceived(
        uint256 indexed assetId,
        address indexed donor,
        uint256 amount
    );

    /// @notice Emitted when the trustee disburses donated funds for a stated purpose.
    /// @param assetId  ID of the asset whose funds are being released
    /// @param to       Recipient address
    /// @param amount   Amount disbursed in wei
    /// @param purpose  Description of the disbursement purpose
    event FundsDisbursed(
        uint256 indexed assetId,
        address indexed to,
        uint256 amount,
        string purpose
    );

    /// @notice Emitted when the owner approves a new trustee address.
    event TrusteeApproved(address indexed trustee);

    /// @notice Emitted when the owner revokes a trustee address.
    event TrusteeRevoked(address indexed trustee);

    /// @notice Contract constructor. Sets the deployer as the initial owner.
    /// @param initialOwner Address that will own the contract and manage trustee approvals.
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Trustee Management ───────────────────────────────────────────────

    /// @notice Approves an address to be assigned as a trustee for new assets.
    /// @dev    Only the contract owner can call this.
    /// @param _trustee Address to approve
    function approveTrustee(address _trustee) external onlyOwner {
        require(_trustee != address(0), "WaqfRegistry: cannot approve zero address");
        require(!approvedTrustees[_trustee], "WaqfRegistry: trustee already approved");
        approvedTrustees[_trustee] = true;
        emit TrusteeApproved(_trustee);
    }

    /// @notice Revokes a previously approved trustee address.
    /// @dev    Only the contract owner can call this. Existing assets managed by
    ///         the revoked address keep their trustee; only new asset creation is affected.
    /// @param _trustee Address to revoke
    function revokeTrustee(address _trustee) external onlyOwner {
        require(approvedTrustees[_trustee], "WaqfRegistry: trustee not approved");
        approvedTrustees[_trustee] = false;
        emit TrusteeRevoked(_trustee);
    }

    // ─── Asset Creation ───────────────────────────────────────────────────

    /// @notice Registers a new Waqf asset on-chain.
    /// @dev    `name`, `beneficiaryCategory`, and `trustee` are set once and are
    ///         permanently immutable — there is no setter or update function for them.
    ///         This enforces the Shariah principle of **luzūm** (irrevocability):
    ///         once a waqf is founded, its purpose and governance cannot be revoked
    ///         or reassigned.
    /// @param _name                Human-readable name of the endowment
    /// @param _description         Detailed description of the asset and its goals
    /// @param _beneficiaryCategory Category of beneficiaries (e.g. "orphans", "students")
    /// @param _trustee             Address authorized to disburse donated funds
    /// @param _fundingGoal         Target funding amount in wei
    /// @return id                  The unique identifier assigned to the new asset
    function createAsset(
        string calldata _name,
        string calldata _description,
        string calldata _beneficiaryCategory,
        address _trustee,
        uint256 _fundingGoal
    ) external returns (uint256 id) {
        require(bytes(_name).length > 0, "WaqfRegistry: name required");
        require(
            bytes(_beneficiaryCategory).length > 0,
            "WaqfRegistry: beneficiary category required"
        );
        require(
            _trustee != address(0),
            "WaqfRegistry: trustee cannot be zero address"
        );
        require(_fundingGoal > 0, "WaqfRegistry: funding goal must be > 0");
        require(
            approvedTrustees[_trustee],
            "WaqfRegistry: trustee is not approved"
        );

        id = nextAssetId++;

        assets[id] = WaqfAsset({
            id: id,
            name: _name,
            description: _description,
            beneficiaryCategory: _beneficiaryCategory,
            fundingGoal: _fundingGoal,
            totalDonated: 0,
            trustee: _trustee,
            isActive: true
        });

        emit AssetCreated(id, _name, _beneficiaryCategory, _trustee, _fundingGoal);
    }

    // ─── Donations ────────────────────────────────────────────────────────

    /// @notice Sends a monetary donation to a registered Waqf asset.
    /// @dev    Accepted funds are held by this contract. The donation is recorded
    ///         per-donor so contribution history is fully transparent on-chain.
    ///         This supports the Shariah principle of **sadaqah jāriyah**
    ///         (ongoing charity) — donors contribute to a perpetual endowment
    ///         whose benefits continue indefinitely.
    /// @param _assetId ID of the Waqf asset to donate to
    function donate(uint256 _assetId) external payable {
        WaqfAsset storage asset = assets[_assetId];

        require(asset.isActive, "WaqfRegistry: asset does not exist or is inactive");
        require(msg.value > 0, "WaqfRegistry: donation must be > 0");

        donations[_assetId][msg.sender] += msg.value;
        asset.totalDonated += msg.value;

        emit DonationReceived(_assetId, msg.sender, msg.value);
    }

    // ─── Disbursement ─────────────────────────────────────────────────────

    /// @notice Disburses donated funds toward the asset's stated charitable purpose.
    /// @dev    **Trustee-only.** The contract verifies `msg.sender == trustee`.
    ///         Only donated funds (not the corpus record) are moved — the WaqfAsset
    ///         struct itself is never modified, transferred, or deleted by this or
    ///         any other function. This enforces two Shariah principles:
    ///         - **Amīn** (trusteeship): only the appointed trustee manages disbursement
    ///         - **Ta'bīd** (perpetuity): the waqf corpus is permanent and inalienable;
    ///           only the yields/donations are spent, never the endowment itself
    /// @param _assetId ID of the Waqf asset whose donated funds are being released
    /// @param _to      Recipient address (e.g. a school, hospital, beneficiary org)
    /// @param _amount  Amount in wei to disburse
    /// @param _purpose Human-readable description of how the funds will be used
    function disburseFunds(
        uint256 _assetId,
        address payable _to,
        uint256 _amount,
        string calldata _purpose
    ) external {
        WaqfAsset storage asset = assets[_assetId];

        require(asset.isActive, "WaqfRegistry: asset does not exist or is inactive");
        require(
            msg.sender == asset.trustee,
            "WaqfRegistry: only the trustee can disburse funds"
        );
        require(
            _to != address(0),
            "WaqfRegistry: recipient cannot be zero address"
        );
        require(
            _amount > 0,
            "WaqfRegistry: disbursement amount must be > 0"
        );
        require(
            _amount <= asset.totalDonated,
            "WaqfRegistry: amount exceeds donated funds"
        );
        require(
            bytes(_purpose).length > 0,
            "WaqfRegistry: purpose is required"
        );

        // Reduce the available donated balance.
        // The WaqfAsset struct (corpus record) is NOT modified beyond the balance
        // counter — no ownership transfer, deletion, or deactivation occurs.
        asset.totalDonated -= _amount;

        (bool success, ) = _to.call{value: _amount}("");
        require(success, "WaqfRegistry: fund transfer failed");

        emit FundsDisbursed(_assetId, _to, _amount, _purpose);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────

    /// @notice Returns the full WaqfAsset record for a given asset ID.
    /// @param _assetId ID of the asset to query
    /// @return asset  The stored WaqfAsset struct
    function getAsset(uint256 _assetId) external view returns (WaqfAsset memory asset) {
        asset = assets[_assetId];
        require(asset.isActive, "WaqfRegistry: asset does not exist or is inactive");
    }

    /// @notice Returns the cumulative donation amount from a specific donor to an asset.
    /// @param _assetId ID of the asset
    /// @param _donor   Address of the donor
    /// @return amount  Total wei donated by `_donor` to asset `_assetId`
    function getDonation(uint256 _assetId, address _donor)
        external
        view
        returns (uint256 amount)
    {
        amount = donations[_assetId][_donor];
    }
}
