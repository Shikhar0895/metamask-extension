import { isValidHexAddress } from '@metamask/controller-utils';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  MetaMetricsEventName,
  MetaMetricsTokenEventSource,
} from '../../../../shared/constants/metametrics';
import { AssetType } from '../../../../shared/constants/transaction';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import { getNftsDropdownState } from '../../../ducks/metamask/metamask';
import {
  AlignItems,
  Display,
  FlexDirection,
  IconColor,
  JustifyContent,
  Severity,
  Size,
} from '../../../helpers/constants/design-system';
import { DEFAULT_ROUTE } from '../../../helpers/constants/routes';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  getCurrentChainId,
  getIsMainnet,
  getSelectedAddress,
  getUseNftDetection,
} from '../../../selectors';
import {
  addNftVerifyOwnership,
  getTokenStandardAndDetails,
  ignoreTokens,
  setNewNftAddedMessage,
  updateNftDropDownState,
} from '../../../store/actions';
import NftsDetectionNoticeImportNFTs from '../../app/nfts-detection-notice-import-nfts/nfts-detection-notice-import-nfts';
import {
  BannerAlert,
  Box,
  ButtonPrimary,
  ButtonSecondary,
  ButtonSecondarySize,
  FormTextField,
  Icon,
  IconName,
  IconSize,
  Label,
  Modal,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '../../component-library';
import Tooltip from '../../ui/tooltip';

export const ImportNftsModal = ({ onClose }) => {
  const t = useI18nContext();
  const history = useHistory();
  const dispatch = useDispatch();
  const useNftDetection = useSelector(getUseNftDetection);
  const isMainnet = useSelector(getIsMainnet);
  const nftsDropdownState = useSelector(getNftsDropdownState);
  const selectedAddress = useSelector(getSelectedAddress);
  const chainId = useSelector(getCurrentChainId);
  const {
    tokenAddress: initialTokenAddress,
    tokenId: initialTokenId,
    ignoreErc20Token,
  } = useSelector((state) => state.appState.importNftsModal);

  const [nftAddress, setNftAddress] = useState(initialTokenAddress ?? '');
  const [tokenId, setTokenId] = useState(initialTokenId ?? '');
  const [disabled, setDisabled] = useState(true);
  const [nftAddFailed, setNftAddFailed] = useState(false);
  const trackEvent = useContext(MetaMetricsContext);

  const handleAddNft = async () => {
    try {
      await dispatch(addNftVerifyOwnership(nftAddress, tokenId));
      const newNftDropdownState = {
        ...nftsDropdownState,
        [selectedAddress]: {
          ...nftsDropdownState?.[selectedAddress],
          [chainId]: {
            ...nftsDropdownState?.[selectedAddress]?.[chainId],
            [nftAddress]: true,
          },
        },
      };

      dispatch(updateNftDropDownState(newNftDropdownState));
    } catch (error) {
      const { message } = error;
      dispatch(setNewNftAddedMessage(message));
      setNftAddFailed(true);
      return;
    }
    if (ignoreErc20Token && nftAddress) {
      await dispatch(
        ignoreTokens({
          tokensToIgnore: nftAddress,
          dontShowLoadingIndicator: true,
        }),
      );
    }
    dispatch(setNewNftAddedMessage('success'));

    const tokenDetails = await getTokenStandardAndDetails(
      nftAddress,
      null,
      tokenId.toString(),
    );

    trackEvent({
      event: MetaMetricsEventName.TokenAdded,
      category: 'Wallet',
      sensitiveProperties: {
        token_contract_address: nftAddress,
        token_symbol: tokenDetails?.symbol,
        tokenId: tokenId.toString(),
        asset_type: AssetType.NFT,
        token_standard: tokenDetails?.standard,
        source_connection_method: MetaMetricsTokenEventSource.Custom,
      },
    });

    history.push(DEFAULT_ROUTE);
    onClose();
  };

  const validateAndSetAddress = (val) => {
    setDisabled(!isValidHexAddress(val) || !tokenId);
    setNftAddress(val);
  };

  const validateAndSetTokenId = (val) => {
    setDisabled(!isValidHexAddress(nftAddress) || !val || isNaN(Number(val)));
    setTokenId(val);
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        onClose();
      }}
      className="import-nfts-modal"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader
          onClose={() => {
            onClose();
          }}
        >
          {t('importNFT')}
        </ModalHeader>
        <Box>
          {isMainnet && !useNftDetection ? (
            <Box marginTop={6}>
              <NftsDetectionNoticeImportNFTs />
            </Box>
          ) : null}
          {nftAddFailed && (
            <Box marginTop={6}>
              <BannerAlert
                severity={Severity.Danger}
                onClose={() => setNftAddFailed(false)}
                closeButtonProps={{ 'data-testid': 'add-nft-error-close' }}
              >
                {t('nftAddFailedMessage')}
              </BannerAlert>
            </Box>
          )}
          <Box
            display={Display.Flex}
            flexDirection={FlexDirection.Column}
            gap={6}
            marginTop={6}
            marginBottom={6}
          >
            <Box>
              <Box
                display={Display.Flex}
                justifyContent={JustifyContent.spaceBetween}
                alignItems={AlignItems.flexEnd}
              >
                <Box display={Display.Flex} alignItems={AlignItems.center}>
                  <Label htmlFor="address">{t('address')}</Label>
                  <Tooltip
                    title={t('importNFTAddressToolTip')}
                    position="bottom"
                  >
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Sm}
                      marginLeft={1}
                      color={IconColor.iconAlternative}
                    />
                  </Tooltip>
                </Box>
              </Box>
              <FormTextField
                autoFocus
                dataTestId="address"
                id="address"
                placeholder="0x..."
                value={nftAddress}
                onChange={(e) => {
                  validateAndSetAddress(e.target.value);
                  setNftAddFailed(false);
                }}
              />
            </Box>
            <Box>
              <Box
                display={Display.Flex}
                justifyContent={JustifyContent.spaceBetween}
                alignItems={AlignItems.flexEnd}
              >
                <Box display={Display.Flex} alignItems={AlignItems.center}>
                  <Label htmlFor="token-id">{t('tokenId')}</Label>
                  <Tooltip
                    title={t('importNFTTokenIdToolTip')}
                    position="bottom"
                  >
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Sm}
                      marginLeft={1}
                      color={IconColor.iconAlternative}
                    />
                  </Tooltip>
                </Box>
              </Box>
              <FormTextField
                dataTestId="token-id"
                id="token-id"
                placeholder={t('nftTokenIdPlaceholder')}
                value={tokenId}
                onChange={(e) => {
                  validateAndSetTokenId(e.target.value);
                  setNftAddFailed(false);
                }}
              />
            </Box>
          </Box>
        </Box>
        <Box
          display={Display.Flex}
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
          gap={4}
          paddingTop={4}
          paddingBottom={4}
        >
          <ButtonSecondary
            size={ButtonSecondarySize.Lg}
            onClick={() => onClose()}
            block
            className="import-nfts-modal__cancel-button"
          >
            {t('cancel')}
          </ButtonSecondary>
          <ButtonPrimary
            size={Size.LG}
            onClick={() => handleAddNft()}
            disabled={disabled}
            block
            data-testid="import-nfts-modal-import-button"
          >
            {t('import')}
          </ButtonPrimary>
        </Box>
      </ModalContent>
    </Modal>
  );
};

ImportNftsModal.propTypes = {
  /**
   * Executes when the modal closes
   */
  onClose: PropTypes.func.isRequired,
};
