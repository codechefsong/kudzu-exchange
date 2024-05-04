// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

import "./interfaces/IERC6551Account.sol";
import "./interfaces/IERC6551Executable.sol";

interface KUDZU {
    function approve(address to, uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}

contract ERC6551Account is
    IERC165,
    IERC1271,
    IERC6551Account,
    IERC6551Executable
{
    KUDZU public kudzuContract = KUDZU(0x94E84f2DBB9b068eA01DB531E7343ec2385B7052);

    uint256 public state;

    function isInfected() public view returns (bool) {
		return kudzuContract.balanceOf(address(this)) > 0;
	}

	function infectedWithTokenId() public view returns (uint256) {
		if(!isInfected()) {
			return 0;
		}
		return kudzuContract.tokenOfOwnerByIndex(address(this),0);
	}

	function tokenURI() public view returns (string memory) {
		if(!isInfected()) {
			return "";
		}
		return kudzuContract.tokenURI(kudzuContract.tokenOfOwnerByIndex(address(this),0));
	}

	function infect(address toAddress) public {
        require(_isValidSigner(msg.sender), "Invalid signer");
		require(isInfected(), "not infected yet");
		kudzuContract.transferFrom(address(this),toAddress,kudzuContract.tokenOfOwnerByIndex(address(this),0));
	}

	bool public canPubliclyInfect = false;

	function setCanPubliclyInfect(bool _canPubliclyInfect) public {
        require(_isValidSigner(msg.sender), "Invalid signer");
		canPubliclyInfect = _canPubliclyInfect;
	}

	function publiclyInfect(address toAddress) public {
		require(isInfected(), "not infected yet");
		require(canPubliclyInfect, "public infection is disabled by owner for this container");
		kudzuContract.transferFrom(address(this),toAddress,kudzuContract.tokenOfOwnerByIndex(address(this),0));
	}

    receive() external payable {}

    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint256 operation
    ) public payable virtual returns (bytes memory result) {
        require(_isValidSigner(msg.sender), "Invalid signer");
        require(operation == 0, "Only call operations are supported");

        ++state;

        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function isValidSigner(
        address signer,
        bytes calldata
    ) public view virtual returns (bytes4) {
        if (_isValidSigner(signer)) {
            return IERC6551Account.isValidSigner.selector;
        }

        return bytes4(0);
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) public view virtual returns (bytes4 magicValue) {
        bool isValid = SignatureChecker.isValidSignatureNow(
            owner(),
            hash,
            signature
        );

        if (isValid) {
            return IERC1271.isValidSignature.selector;
        }

        return "";
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public pure virtual returns (bool) {
        return (interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC6551Account).interfaceId ||
            interfaceId == type(IERC6551Executable).interfaceId);
    }

    function token() public view virtual returns (uint256, address, uint256) {
        bytes memory footer = new bytes(0x60);

        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }

        return abi.decode(footer, (uint256, address, uint256));
    }

    function owner() public view virtual returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);

        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function _isValidSigner(
        address signer
    ) internal view virtual returns (bool) {
        return signer == owner();
    }
}
