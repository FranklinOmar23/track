import { useState, useCallback } from 'react';

const useModal = () => {
  const [modalData, setModalData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const openModal = useCallback((data = null) => {
    setModalData(data);
    setIsOpen(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setModalData(null);
    setIsOpen(false);
  }, []);
  
  return { isOpen, modalData, openModal, closeModal };
};

export default useModal;