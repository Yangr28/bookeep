import { useState, useCallback } from 'react';

// 主 Tab 页（底部导航）：'/' 首页、'/records' 账单、'/accounts' 资产、'/profile' 我的
// '/record'（记账/编辑页）作为普通入栈页面：编辑保存后可返回进入前的来源页
const mainPages = ['/', '/records', '/accounts', '/profile'];

interface HistoryState {
  currentPage: string;
  history: string[];
}

export const useHistory = () => {
  const [state, setState] = useState<HistoryState>({
    currentPage: '/',
    history: ['/'],
  });

  const handlePageChange = useCallback((page: string) => {
    setState(prev => {
      const newHistory = [...prev.history];
      
      if (mainPages.includes(page)) {
        const existingIndex = newHistory.lastIndexOf(page);
        if (existingIndex >= 0) {
          return {
            currentPage: page,
            history: newHistory.slice(0, existingIndex + 1),
          };
        }
        let currentMainIndex = -1;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          if (mainPages.includes(newHistory[i])) {
            currentMainIndex = i;
            break;
          }
        }
        if (currentMainIndex >= 0) {
          return {
            currentPage: page,
            history: [...newHistory.slice(0, currentMainIndex + 1), page],
          };
        }
        return {
          currentPage: page,
          history: [page],
        };
      }
      
      return {
        currentPage: page,
        history: [...newHistory, page],
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.history.length <= 1) {
        return prev;
      }
      
      const newHistory = [...prev.history];
      newHistory.pop();
      const newPage = newHistory[newHistory.length - 1];
      
      return {
        currentPage: newPage,
        history: newHistory,
      };
    });
  }, []);

  const canGoBack = useCallback(() => {
    return state.history.length > 1;
  }, [state.history.length]);

  const resetHistory = useCallback((page: string = '/') => {
    setState({
      currentPage: page,
      history: [page],
    });
  }, []);

  return {
    currentPage: state.currentPage,
    history: state.history,
    handlePageChange,
    goBack,
    canGoBack,
    resetHistory,
  };
};