export default function ComponentSection({ title, children }) {
  return (
    <section className="ComponentSection__wrapper">
      <h1>{title}</h1>
      {children}
    </section>
  );
}
