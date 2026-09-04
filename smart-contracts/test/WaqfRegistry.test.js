const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WaqfRegistry", function () {
  let registry;
  let owner, trustee, donor1, donor2, beneficiary, outsider;

  const ASSET_NAME = "Al-Noor School Endowment";
  const ASSET_DESC = "Funds construction of a primary school in rural Sindh";
  const BENEFICIARY_CAT = "education";
  const FUNDING_GOAL = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, trustee, donor1, donor2, beneficiary, outsider] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("WaqfRegistry");
    registry = await Factory.deploy(owner.address);
    await registry.waitForDeployment();

    // Approve the trustee used by most tests
    await registry.connect(owner).approveTrustee(trustee.address);
  });

  // ─── 1. createAsset() — success path ────────────────────────────────────

  describe("trustee approval", function () {
    it("should allow only the owner to approve a trustee", async function () {
      const newTrustee = outsider;

      await expect(registry.connect(owner).approveTrustee(newTrustee.address))
        .to.emit(registry, "TrusteeApproved")
        .withArgs(newTrustee.address);

      expect(await registry.approvedTrustees(newTrustee.address)).to.equal(true);
    });

    it("should allow only the owner to revoke an approved trustee", async function () {
      await expect(registry.connect(owner).revokeTrustee(trustee.address))
        .to.emit(registry, "TrusteeRevoked")
        .withArgs(trustee.address);

      expect(await registry.approvedTrustees(trustee.address)).to.equal(false);
    });

    it("should revert if a non-owner tries to approve a trustee", async function () {
      await expect(
        registry.connect(outsider).approveTrustee(outsider.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should revert if a non-owner tries to revoke a trustee", async function () {
      await expect(
        registry.connect(outsider).revokeTrustee(trustee.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should revert when approving the zero address", async function () {
      await expect(
        registry.connect(owner).approveTrustee(ethers.ZeroAddress)
      ).to.be.revertedWith("WaqfRegistry: cannot approve zero address");
    });

    it("should revert when approving an already-approved trustee", async function () {
      await expect(
        registry.connect(owner).approveTrustee(trustee.address)
      ).to.be.revertedWith("WaqfRegistry: trustee already approved");
    });

    it("should revert when revoking a trustee that is not approved", async function () {
      await expect(
        registry.connect(owner).revokeTrustee(outsider.address)
      ).to.be.revertedWith("WaqfRegistry: trustee not approved");
    });
  });

  describe("createAsset", function () {
    it("should create an asset with valid inputs and emit AssetCreated", async function () {
      await expect(
        registry.createAsset(ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL)
      )
        .to.emit(registry, "AssetCreated")
        .withArgs(0, ASSET_NAME, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL);

      const asset = await registry.getAsset(0);
      expect(asset.id).to.equal(0);
      expect(asset.name).to.equal(ASSET_NAME);
      expect(asset.description).to.equal(ASSET_DESC);
      expect(asset.beneficiaryCategory).to.equal(BENEFICIARY_CAT);
      expect(asset.fundingGoal).to.equal(FUNDING_GOAL);
      expect(asset.totalDonated).to.equal(0);
      expect(asset.trustee).to.equal(trustee.address);
      expect(asset.isActive).to.equal(true);

      expect(await registry.nextAssetId()).to.equal(1);
    });

    // ─── 2. createAsset() — validation reverts ────────────────────────────

    it("should revert if trustee is not approved", async function () {
      await expect(
        registry.createAsset(ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, outsider.address, FUNDING_GOAL)
      ).to.be.revertedWith("WaqfRegistry: trustee is not approved");
    });

    it("should revert if trustee is the zero address", async function () {
      await expect(
        registry.createAsset(ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, ethers.ZeroAddress, FUNDING_GOAL)
      ).to.be.revertedWith("WaqfRegistry: trustee cannot be zero address");
    });

    it("should revert if fundingGoal is 0", async function () {
      await expect(
        registry.createAsset(ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, trustee.address, 0)
      ).to.be.revertedWith("WaqfRegistry: funding goal must be > 0");
    });

    it("should revert if name is empty", async function () {
      await expect(
        registry.createAsset("", ASSET_DESC, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL)
      ).to.be.revertedWith("WaqfRegistry: name required");
    });

    it("should revert if beneficiaryCategory is empty", async function () {
      await expect(
        registry.createAsset(ASSET_NAME, ASSET_DESC, "", trustee.address, FUNDING_GOAL)
      ).to.be.revertedWith("WaqfRegistry: beneficiary category required");
    });

    // ─── 3. Irrevocability (luzūm) — Shariah principle verification ───────

    /**
     * SHARIAH IRREVOCABILITY CHECK (Luzūm — لزوم)
     *
     * This is NOT a standard access-control test. In Islamic jurisprudence,
     * once a waqf is established its purpose, beneficiary category, and
     * governance (trustee) are permanently fixed by the founder's declaration.
     *
     * We verify this by confirming that NO setter functions exist on the
     * contract interface for `name`, `beneficiaryCategory`, or `trustee`.
     * If any such function were added, the waqf's irrevocability guarantee
     * would be violated at the protocol level.
     */
    it("should have NO setter functions for name, beneficiaryCategory, or trustee (Shariah: luzūm)", async function () {
      // Confirm the contract interface does not expose any mutation function
      // for the immutable fields. A non-null return would mean a setter exists.
      expect(registry.interface.getFunction("setName")).to.be.null;
      expect(registry.interface.getFunction("setBeneficiaryCategory")).to.be.null;
      expect(registry.interface.getFunction("setTrustee")).to.be.null;
      expect(registry.interface.getFunction("updateName")).to.be.null;
      expect(registry.interface.getFunction("updateBeneficiaryCategory")).to.be.null;
      expect(registry.interface.getFunction("updateTrustee")).to.be.null;
      expect(registry.interface.getFunction("changeTrustee")).to.be.null;

      // Create an asset and re-confirm the fields remain unchanged —
      // no other function in the contract modifies them post-creation.
      await registry.createAsset(
        ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL
      );

      const asset = await registry.getAsset(0);
      expect(asset.name).to.equal(ASSET_NAME);
      expect(asset.beneficiaryCategory).to.equal(BENEFICIARY_CAT);
      expect(asset.trustee).to.equal(trustee.address);
    });
  });

  // ─── 4–5. donate() ──────────────────────────────────────────────────────

  describe("donate", function () {
    beforeEach(async function () {
      await registry.createAsset(
        ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL
      );
    });

    it("should accept a donation, increase totalDonated, and emit DonationReceived", async function () {
      const amount = ethers.parseEther("5");

      await expect(
        registry.connect(donor1).donate(0, { value: amount })
      )
        .to.emit(registry, "DonationReceived")
        .withArgs(0, donor1.address, amount);

      const asset = await registry.getAsset(0);
      expect(asset.totalDonated).to.equal(amount);

      expect(await registry.getDonation(0, donor1.address)).to.equal(amount);
    });

    it("should accumulate multiple donations from the same donor", async function () {
      const first = ethers.parseEther("2");
      const second = ethers.parseEther("3");

      await registry.connect(donor1).donate(0, { value: first });
      await registry.connect(donor1).donate(0, { value: second });

      expect(await registry.getDonation(0, donor1.address)).to.equal(first + second);

      const asset = await registry.getAsset(0);
      expect(asset.totalDonated).to.equal(first + second);
    });

    // ─── 5. donate() — revert cases ───────────────────────────────────────

    it("should revert if asset does not exist (isActive false)", async function () {
      await expect(
        registry.connect(donor1).donate(999, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("WaqfRegistry: asset does not exist or is inactive");
    });

    it("should revert if msg.value is 0", async function () {
      await expect(
        registry.connect(donor1).donate(0, { value: 0 })
      ).to.be.revertedWith("WaqfRegistry: donation must be > 0");
    });
  });

  // ─── 6–8. disburseFunds() ───────────────────────────────────────────────

  describe("disburseFunds", function () {
    const DONATION = ethers.parseEther("10");
    const DISBURSE_AMOUNT = ethers.parseEther("4");

    beforeEach(async function () {
      await registry.createAsset(
        ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL
      );
      await registry.connect(donor1).donate(0, { value: DONATION });
    });

    it("should disburse funds when called by the trustee, reduce totalDonated, and emit FundsDisbursed", async function () {
      const recipientBalBefore = await ethers.provider.getBalance(beneficiary.address);

      await expect(
        registry
          .connect(trustee)
          .disburseFunds(0, beneficiary.address, DISBURSE_AMOUNT, "school supplies")
      )
        .to.emit(registry, "FundsDisbursed")
        .withArgs(0, beneficiary.address, DISBURSE_AMOUNT, "school supplies");

      // totalDonated should decrease by the disbursed amount
      const asset = await registry.getAsset(0);
      expect(asset.totalDonated).to.equal(DONATION - DISBURSE_AMOUNT);

      // Beneficiary should have received the ETH
      const recipientBalAfter = await ethers.provider.getBalance(beneficiary.address);
      expect(recipientBalAfter - recipientBalBefore).to.equal(DISBURSE_AMOUNT);
    });

    it("should preserve the corpus: asset name, trustee, beneficiaryCategory remain unchanged after disbursement", async function () {
      await registry
        .connect(trustee)
        .disburseFunds(0, beneficiary.address, DISBURSE_AMOUNT, "textbooks");

      const asset = await registry.getAsset(0);
      expect(asset.name).to.equal(ASSET_NAME);
      expect(asset.beneficiaryCategory).to.equal(BENEFICIARY_CAT);
      expect(asset.trustee).to.equal(trustee.address);
      expect(asset.isActive).to.equal(true);
    });

    // ─── 7. disburseFunds() — non-trustee reverts ─────────────────────────

    it("should revert when called by anyone other than the trustee", async function () {
      await expect(
        registry
          .connect(outsider)
          .disburseFunds(0, beneficiary.address, DISBURSE_AMOUNT, "unauthorized")
      ).to.be.revertedWith("WaqfRegistry: only the trustee can disburse funds");

      // Even the contract deployer cannot disburse
      await expect(
        registry
          .connect(owner)
          .disburseFunds(0, beneficiary.address, DISBURSE_AMOUNT, "owner attempt")
      ).to.be.revertedWith("WaqfRegistry: only the trustee can disburse funds");

      // Even a donor cannot disburse
      await expect(
        registry
          .connect(donor1)
          .disburseFunds(0, beneficiary.address, DISBURSE_AMOUNT, "donor attempt")
      ).to.be.revertedWith("WaqfRegistry: only the trustee can disburse funds");
    });

    // ─── 8. disburseFunds() — amount exceeds totalDonated ─────────────────

    it("should revert if amount exceeds totalDonated", async function () {
      const tooMuch = DONATION + ethers.parseEther("1");

      await expect(
        registry
          .connect(trustee)
          .disburseFunds(0, beneficiary.address, tooMuch, "over-disbursement")
      ).to.be.revertedWith("WaqfRegistry: amount exceeds donated funds");
    });

    it("should revert if disbursement amount is 0", async function () {
      await expect(
        registry
          .connect(trustee)
          .disburseFunds(0, beneficiary.address, 0, "zero disbursement")
      ).to.be.revertedWith("WaqfRegistry: disbursement amount must be > 0");
    });

    it("should revert if recipient is the zero address", async function () {
      await expect(
        registry
          .connect(trustee)
          .disburseFunds(0, ethers.ZeroAddress, DISBURSE_AMOUNT, "zero recipient")
      ).to.be.revertedWith("WaqfRegistry: recipient cannot be zero address");
    });

    it("should revert if purpose is empty", async function () {
      await expect(
        registry
          .connect(trustee)
          .disburseFunds(0, beneficiary.address, DISBURSE_AMOUNT, "")
      ).to.be.revertedWith("WaqfRegistry: purpose is required");
    });
  });

  // ─── 9. getAsset() and getDonation() — view helpers ─────────────────────

  describe("getAsset / getDonation", function () {
    it("should return correct data after several donations from different donors", async function () {
      await registry.createAsset(
        ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL
      );

      const d1First = ethers.parseEther("3");
      const d1Second = ethers.parseEther("2");
      const d2Amount = ethers.parseEther("7");

      await registry.connect(donor1).donate(0, { value: d1First });
      await registry.connect(donor1).donate(0, { value: d1Second });
      await registry.connect(donor2).donate(0, { value: d2Amount });

      // Verify aggregate asset state
      const asset = await registry.getAsset(0);
      expect(asset.totalDonated).to.equal(d1First + d1Second + d2Amount);
      expect(asset.id).to.equal(0);
      expect(asset.name).to.equal(ASSET_NAME);
      expect(asset.fundingGoal).to.equal(FUNDING_GOAL);

      // Verify per-donor breakdown
      expect(await registry.getDonation(0, donor1.address)).to.equal(d1First + d1Second);
      expect(await registry.getDonation(0, donor2.address)).to.equal(d2Amount);
      expect(await registry.getDonation(0, outsider.address)).to.equal(0);
    });

    it("should revert getAsset for a non-existent asset", async function () {
      await expect(registry.getAsset(42)).to.be.revertedWith(
        "WaqfRegistry: asset does not exist or is inactive"
      );
    });

    it("should return 0 for getDonation on an address that never donated", async function () {
      await registry.createAsset(
        ASSET_NAME, ASSET_DESC, BENEFICIARY_CAT, trustee.address, FUNDING_GOAL
      );
      expect(await registry.getDonation(0, outsider.address)).to.equal(0);
    });
  });
});
