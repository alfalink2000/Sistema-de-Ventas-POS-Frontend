import { useState } from "react";
import Input from "../../../ui/Input/Input";
import Button from "../../../ui/Button/Button";
import styles from "./ProductSearch.module.css";

const ProductSearch = ({ onSearch, onClear, loading = false }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    onClear();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchForm}>
      <div className={styles.searchInputContainer}>
        <Input
          type="text"
          placeholder="Buscar productos por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
        />
        <div className={styles.searchButtons}>
          <Button
            type="submit"
            variant="primary"
            disabled={!searchTerm.trim() || loading}
          >
            {loading ? "Buscando..." : "Buscar"}
          </Button>
          {searchTerm && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleClear}
              disabled={loading}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default ProductSearch;
