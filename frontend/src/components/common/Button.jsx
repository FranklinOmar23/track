
const Button = ({ children, variant = 'default', className = '', ...props }) => {
  const baseClass = 'button';
  const variantClass = variant === 'primary' ? 'button-primary' : variant === 'danger' ? 'button-danger' : '';

  return (
    <button className={`${baseClass} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
