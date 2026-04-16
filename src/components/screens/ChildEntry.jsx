import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'hasbaonautica_child_token';

export default function ChildEntry() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    navigate('/play', { replace: true });
  }, []);

  return null;
}
